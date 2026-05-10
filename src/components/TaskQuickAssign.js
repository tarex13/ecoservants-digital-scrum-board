import { useState, useEffect } from '@wordpress/element';
import { Modal, Button, TextControl, TextareaControl, SelectControl, Spinner, Icon } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import CommentThread from './CommentThread';

const TaskQuickAssign = ({ onClose, taskId, tasks, onSave }) => {
    const [selectedTask, setSelectedTask] = useState(taskId);
    const [assignedUser, setAssignedUser] = useState(null);
    const [users, setUsers] = useState([]);
    // Fetch users for the assignee dropdown
    useEffect(() => {
        apiFetch({ path: '/wp/v2/users?per_page=100' })
            .then(data => {setUsers(data); setAssignedUser(data[0].id);})
            .catch(() => {});
    }, []);

    const taskList  = tasks.map((item)=>({label: item.title, value: item.id}));
    const userList  = users.map((u)=>({ label: u.name, value: u.id }));
    
    const styles = {
        div: { marginTop: '20px', padding: '15px', border: '3px solid #f0f0f1', borderRadius: '4px', gap: '10px', display: 'flex', alignItems: 'center' },
        button:{
            rounded: {fontSize: '20px', borderRadius: '100%'},
            square_small: {fontSize: '20px'},
            square_big: {fontSize: '25px'}
        },
        span: { background: '#f0f0f1', padding: '3px' }
    }
    return (
        <Modal
            title={__('Task Quick Assign', 'es-scrum')}
            onRequestClose={onClose}
            shouldCloseOnClickOutside={true}
            style={{ maxWidth: '800px', width: '90%' }}
        >
            
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: '2', minWidth: '300px' }}>
                    <SelectControl
                        label="Assign Task"
                        value={ selectedTask }
                        options={ taskList }
                        onChange={ ( val ) => setSelectedTask( val ) }
                        __next40pxDefaultSize
                    />
                    <SelectControl
                        label="To"
                        options={[
                            {
                            disabled: true,
                            label: 'Select an Option',
                            value: ''
                            }, ...userList
                        ]}
                        value={assignedUser}
                        onChange={(val) => setAssignedUser(val)}
                        style={{ flex: 1, marginBottom: 0 }}
                        __next40pxDefaultSize
                    />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'end', marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '15px' }}>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <Button variant="primary" onClick={()=>onSave(selectedTask, assignedUser)}>
                        {__('Assign', 'es-scrum')}
                    </Button>
                    <Button variant="primary" onClick={onClose}>
                        {__('Close', 'es-scrum')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default TaskQuickAssign;