<?php
/**
 * REST API Controller for Scrum Labels
 */

if (!defined('ABSPATH')) {
    exit;
}

class EcoServants_Scrum_Labels_API extends WP_REST_Controller
{

    public function __construct()
    {
        $this->namespace = 'es-scrum/v1';
        $this->rest_base = 'labels';
    }

    /**
     * Register Routes
     */
    public function register_routes()
    {

        /*
        ---------------------------------------
        LABEL CRUD
        ---------------------------------------
        */

        register_rest_route($this->namespace, '/' . $this->rest_base, array(

            array(
                'methods' => 'GET',
                'callback' => array($this, 'get_labels'),
                'permission_callback' => array($this, 'get_items_permissions_check'),
            ),

            array(
                'methods' => 'POST',
                'callback' => array($this, 'create_label'),
                'permission_callback' => array($this, 'create_item_permissions_check'),
            ),
        ));


        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>[\d]+)', array(

            array(
                'methods' => 'DELETE',
                'callback' => array($this, 'delete_label'),
                'permission_callback' => array($this, 'delete_item_permissions_check'),
            ),
        ));


        /*
        ---------------------------------------
        TASK LABEL RELATION
        ---------------------------------------
        */

        register_rest_route($this->namespace, '/tasks/(?P<task_id>[\d]+)/labels', array(

            array(
                'methods' => 'GET',
                'callback' => array($this, 'get_task_labels'),
                'permission_callback' => array($this, 'get_items_permissions_check'),
            ),

            array(
                'methods' => 'POST',
                'callback' => array($this, 'assign_label'),
                'permission_callback' => array($this, 'create_item_permissions_check'),
            ),
        ));


        register_rest_route($this->namespace, '/tasks/(?P<task_id>[\d]+)/labels/(?P<label_id>[\d]+)', array(

            array(
                'methods' => 'DELETE',
                'callback' => array($this, 'remove_label'),
                'permission_callback' => array($this, 'delete_item_permissions_check'),
            ),
        ));

        register_rest_route($this->namespace, '/tasks/(?P<task_id>[\d]+)/labels', array(

            array(
                'methods' => 'GET',
                'callback' => array($this, 'get_task_labels'),
                'permission_callback' => array($this, 'get_items_permissions_check'),
            ),

            array(
                'methods' => 'POST',
                'callback' => array($this, 'assign_label'),
                'permission_callback' => array($this, 'create_item_permissions_check'),
            ),

            /*
            ---------------------------------------
            BULK REPLACE LABELS
            ---------------------------------------
            */

            array(
                'methods' => 'PUT',
                'callback' => array($this, 'bulk_assign_labels'),
                'permission_callback' => array($this, 'create_item_permissions_check'),
            ),
        ));
    }


    /*
    ---------------------------------------
    PERMISSIONS
    ---------------------------------------
    */

    public function get_items_permissions_check($request)
    {
        return es_scrum_rest_permission_check();
    }

    public function create_item_permissions_check($request)
    {
        return current_user_can('edit_posts');
    }

    public function delete_item_permissions_check($request)
    {
        return current_user_can('edit_posts');
    }


    /*
    ---------------------------------------
    GET ALL LABELS
    GET /labels
    ---------------------------------------
    */
    public function get_labels($request)
    {
        $db = es_scrum_db();
        $labels_table = es_scrum_table_name('labels');
        $join_table = es_scrum_table_name('task_labels');

        $program_slug = $request->get_param('program_slug');
        $filter = $request->get_param('filter');
        $sort = $request->get_param('sort') ?: 'name';
        $order = strtoupper($request->get_param('order') ?: 'ASC');
        $per_page = intval($request->get_param('per_page') ?: 20);
        $page = intval($request->get_param('page') ?: 1);
        $search = $request->get_param('search');
        $color = $request->get_param('color');

        $offset = ($page - 1) * $per_page;

        $where = [];
        $params = [];

        /*
        ---------------------------
        Base Filters
        ---------------------------
        */

        if ($program_slug) {
            $where[] = "l.program_slug = %s";
            $params[] = $program_slug;
        }

        if ($search) {
            $where[] = "l.name LIKE %s";
            $params[] = '%' . $db->esc_like($search) . '%';
        }

        if ($color) {
            $where[] = "l.color = %s";
            $params[] = $color;
        }

        $where_sql = '';

        if (!empty($where)) {
            $where_sql = "WHERE " . implode(' AND ', $where);
        }

        /*
        ---------------------------
        Popular Filter
        ---------------------------
        */

        if ($filter === 'popular') {

            $query = "
            SELECT l.*, COUNT(tl.task_id) as usage_count
            FROM {$labels_table} l
            LEFT JOIN {$join_table} tl ON l.id = tl.label_id
            {$where_sql}
            GROUP BY l.id
            ORDER BY usage_count DESC
            LIMIT %d OFFSET %d
            ";

            $params[] = $per_page;
            $params[] = $offset;

            $labels = $db->get_results($db->prepare($query, ...$params));

        } else {

            /*
            ---------------------------
            Normal Sorting
            ---------------------------
            */

            $allowed_sort = ['name', 'created_at', 'color'];

            if (!in_array($sort, $allowed_sort)) {
                $sort = 'name';
            }

            if ($order !== 'ASC' && $order !== 'DESC') {
                $order = 'ASC';
            }

            $query = "
            SELECT *
            FROM {$labels_table} l
            {$where_sql}
            ORDER BY {$sort} {$order}
            LIMIT %d OFFSET %d
            ";

            $params[] = $per_page;
            $params[] = $offset;

            $labels = $db->get_results($db->prepare($query, ...$params));
        }

        return new WP_REST_Response($labels, 200);
    }


    /*
    ---------------------------------------
    CREATE LABEL
    POST /labels
    ---------------------------------------
    */

    public function create_label($request)
    {
        $params = $request->get_json_params();

        if (empty($params['name'])) {
            return new WP_Error('missing_name', 'Label name required', array('status' => 400));
        }

        $db = es_scrum_db();
        $table = es_scrum_table_name('labels');

        $data = array(
            'name' => sanitize_text_field($params['name']),
            'color' => isset($params['color']) ? sanitize_text_field($params['color']) : null,
            'desc' => isset($params['desc']) ? sanitize_text_field($params['desc']) : null,
            'program_slug' => isset($params['program_slug']) ? sanitize_text_field($params['program_slug']) : 'default-program',
            'created_at' => current_time('mysql', 1)
        );

        $result = $db->insert($table, $data);

        if ($result === false) {
            return new WP_Error('db_error', 'Could not create label', array('status' => 500));
        }

        return new WP_REST_Response(array(
            'id' => $db->insert_id,
            'name' => $data['name'],
            'color' => $data['color'],
            'message' => 'Label created'
        ), 201);
    }


    /*
    ---------------------------------------
    DELETE LABEL
    DELETE /labels/{id}
    ---------------------------------------
    */

    public function delete_label($request)
    {
        $id = $request->get_param('id');

        $db = es_scrum_db();
        $table = es_scrum_table_name('labels');
        $join_table = es_scrum_table_name('task_labels');

        $exists = $db->get_var(
            $db->prepare("SELECT id FROM {$table} WHERE id = %d", $id)
        );

        if (!$exists) {
            return new WP_Error('not_found', 'Label not found', array('status' => 404));
        }

        $db->delete($join_table, array('label_id' => $id), array('%d'));

        $deleted = $db->delete($table, array('id' => $id), array('%d'));

        if ($deleted === false) {
            return new WP_Error('db_error', 'Could not delete label', array('status' => 500));
        }

        return new WP_REST_Response(array(
            'message' => 'Label deleted',
            'id' => $id
        ), 200);
    }


    /*
    ---------------------------------------
    GET LABELS FOR TASK
    GET /tasks/{task_id}/labels
    ---------------------------------------
    */

    public function get_task_labels($request)
    {
        $task_id = $request->get_param('task_id');

        $db = es_scrum_db();
        $labels = es_scrum_table_name('labels');
        $join = es_scrum_table_name('task_labels');

        $sql = $db->prepare(
            "SELECT l.*
            FROM {$labels} l
            INNER JOIN {$join} tl
            ON l.id = tl.label_id
            WHERE tl.task_id = %d",
            $task_id
        );

        $results = $db->get_results($sql);

        return new WP_REST_Response($results, 200);
    }


    /*
    ---------------------------------------
    ASSIGN LABEL TO TASK
    POST /tasks/{task_id}/labels
    ---------------------------------------
    */

    public function assign_label($request)
    {
        $task_id = $request->get_param('task_id');
        $params = $request->get_json_params();

        if (empty($params['label_id'])) {
            return new WP_Error('missing_label', 'label_id required', array('status' => 400));
        }

        $db = es_scrum_db();
        $table = es_scrum_table_name('task_labels');

        $data = array(
            'task_id' => absint($task_id),
            'label_id' => absint($params['label_id']),
            'created_at' => current_time('mysql', 1)
        );

        $insert = $db->insert($table, $data);

        if ($insert === false) {
            return new WP_Error('db_error', 'Could not assign label', array('status' => 500));
        }

        return new WP_REST_Response(array(
            'message' => 'Label assigned'
        ), 201);
    }


    /*
    ---------------------------------------
    REMOVE LABEL FROM TASK
    DELETE /tasks/{task_id}/labels/{label_id}
    ---------------------------------------
    */

    public function remove_label($request)
    {
        $task_id = $request->get_param('task_id');
        $label_id = $request->get_param('label_id');

        $db = es_scrum_db();
        $table = es_scrum_table_name('task_labels');

        $deleted = $db->delete(
            $table,
            array(
                'task_id' => $task_id,
                'label_id' => $label_id
            ),
            array('%d', '%d')
        );

        if ($deleted === false) {
            return new WP_Error('db_error', 'Could not remove label', array('status' => 500));
        }

        return new WP_REST_Response(array(
            'message' => 'Label removed'
        ), 200);
    }

    public function bulk_assign_labels($request)
    {
        $db = es_scrum_db();

        $task_id = intval($request->get_param('task_id'));
        $labels = $request->get_param('labels');

        if (!is_array($labels)) {
            return new WP_Error(
                'invalid_labels',
                'Labels must be an array of label IDs.',
                array('status' => 400)
            );
        }

        $join_table = es_scrum_table_name('task_labels');

        /*
        ---------------------------------------
        Remove Existing Labels
        ---------------------------------------
        */

        $db->delete(
            $join_table,
            array('task_id' => $task_id),
            array('%d')
        );

        /*
        ---------------------------------------
        Insert New Labels
        ---------------------------------------
        */

        foreach ($labels as $label_id) {

            $db->insert(
                $join_table,
                array(
                    'task_id' => $task_id,
                    'label_id' => intval($label_id)
                ),
                array('%d', '%d')
            );
        }

        return new WP_REST_Response(
            array(
                'message' => 'Labels updated successfully.',
                'task_id' => $task_id,
                'labels' => $labels
            ),
            200
        );
    }
}