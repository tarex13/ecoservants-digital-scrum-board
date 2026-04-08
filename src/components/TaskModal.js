import { useState, useEffect } from '@wordpress/element';
import { Modal, Button, TextControl, TextareaControl, SelectControl, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import CommentThread from './CommentThread';
import LabelFilter from './LabelFilter';

const STATUS_OPTIONS = [
    { label: __('Backlog', 'es-scrum'), value: 'backlog' },
    { label: __('To Do', 'es-scrum'), value: 'todo' },
    { label: __('In Progress', 'es-scrum'), value: 'in-progress' },
    { label: __('Done', 'es-scrum'), value: 'done' },
];

const PRIORITY_OPTIONS = [
    { label: __('High', 'es-scrum'), value: 'high' },
    { label: __('Medium', 'es-scrum'), value: 'medium' },
    { label: __('Low', 'es-scrum'), value: 'low' },
];

const TYPE_OPTIONS = [
    { label: __('Task', 'es-scrum'), value: 'task' },
    { label: __('Bug', 'es-scrum'), value: 'bug' },
    { label: __('Story', 'es-scrum'), value: 'story' },
];

const TaskModal = ({ task, onClose, onSave, onDelete }) => {
    const isNew = !task;
    
    // Form state
    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [status, setStatus] = useState(task?.status || 'backlog');
    const [selectedLabels, setSelectedLabels] = useState(task?.labels?.map((l)=> l.id) || []);
    const [priority, setPriority] = useState(task?.priority || 'medium');
    const [type, setType] = useState(task?.type || 'task');
    const [storyPoints, setStoryPoints] = useState(task?.story_points || '');
    const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.split(' ')[0] : '');
    const [programSlug, setProgramSlug] = useState(task?.program_slug || '');
    const [assigneeId, setAssigneeId] = useState(task?.assignee_id || '');
    
    // Attachments parser (handles JSON string from backend or legacy text)
    const [attachments, setAttachments] = useState(() => {
        if (!task || !task.attachments) return [];
        try {
            return JSON.parse(task.attachments);
        } catch (e) {
            return []; // Legacy fallback
        }
    });

    const [users, setUsers] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState(null);

    // Fetch users for the assignee dropdown
    useEffect(() => {
        apiFetch({ path: '/wp/v2/users?per_page=100' })
            .then(data => setUsers(data))
            .catch(() => {});
    }, []);

    const handleSave = () => {
        if (!title.trim()) {
            setError(__('Title is required.', 'es-scrum'));
            return;
        }

        setIsSaving(true);
        setError(null);

        const taskData = {
            title,
            description,
            status,
            priority,
            type,
            story_points: storyPoints ? parseInt(storyPoints, 10) : null,
            due_date: dueDate || null,
            program_slug: programSlug || null,
            assignee_id: assigneeId ? parseInt(assigneeId, 10) : null,
            attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
            labels: selectedLabels,
        };

        const path = isNew ? '/es-scrum/v1/tasks' : `/es-scrum/v1/tasks/${task.id}`;
        const method = isNew ? 'POST' : 'PATCH';

        apiFetch({ path, method, data: taskData })
            .then((savedTask) => {
                setIsSaving(false);
                onSave(savedTask); // Triggers parent to refresh list & close modal
            })
            .catch((err) => {
                console.error(err);
                setError(err.message || __('Failed to save task.', 'es-scrum'));
                setIsSaving(false);
            });
    };

    const handleMediaSelect = (media) => {
        const newAttachment = {
            id: media.id,
            url: media.url,
            title: media.title || media.filename,
            type: media.type,
            icon: media.icon
        };
        setAttachments([...attachments, newAttachment]);
    };

    const removeAttachment = (idToRemove) => {
        setAttachments(attachments.filter(a => a.id !== idToRemove));
    };

    const handleDelete = () => {
        if (!task || !task.id) return;
        const confirmed = window.confirm(__('Are you sure you want to delete this task? This cannot be undone.', 'es-scrum'));
        if (!confirmed) return;

        setIsDeleting(true);
        setError(null);

        apiFetch({ path: `/es-scrum/v1/tasks/${task.id}`, method: 'DELETE' })
            .then(() => {
                setIsDeleting(false);
                if (onDelete) onDelete(task.id);
            })
            .catch((err) => {
                console.error(err);
                setError(err.message || __('Failed to delete task.', 'es-scrum'));
                setIsDeleting(false);
            });
    };

    const userOptions = [
        { label: __('Unassigned', 'es-scrum'), value: '' },
        ...users.map(u => ({ label: u.name, value: u.id }))
    ];

    return (
        <Modal
            title={isNew ? __('Create Task', 'es-scrum') : __('Edit Task', 'es-scrum')}
            onRequestClose={onClose}
            shouldCloseOnClickOutside={false}
            style={{ maxWidth: '800px', width: '90%' }}
        >
            {error && <div className="notice notice-error"><p>{error}</p></div>}
            
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', paddingBottom: '10px' }}>
                        {task?.labels?.map(({ name, color }, index) => (
                            <label key={index} style={{ padding: '2px 6px', fontSize: 'x-small', borderLeft: '3px solid ' + color, borderTop: '1px solid ' + color, borderBottom: '1px solid ' + color, borderRight: '1px solid ' + color, color, boxShadow: '4px 3px 10px 0px rgba(0,0,0,0.05)', borderRadius: '5px', }}>{name}</label>
                        ))}
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: '2', minWidth: '300px' }}>
                    <TextControl
                        label={__('Title *', 'es-scrum')}
                        value={title}
                        onChange={setTitle}
                        required
                    />
                    <TextareaControl
                        label={__('Description', 'es-scrum')}
                        value={description}
                        onChange={setDescription}
                        rows={6}
                    />

                    <div style={{ marginTop: '20px', padding: '15px', background: '#f0f0f1', borderRadius: '4px' }}>
                        <h4 style={{ margin: '0 0 10px' }}>{__('Attachments', 'es-scrum')}</h4>
                        {attachments.length > 0 && (
                            <ul style={{ margin: '0 0 15px', paddingLeft: 0, listStyle: 'none' }}>
                                {attachments.map(att => (
                                    <li key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', background: '#fff', padding: '6px 10px', borderRadius: '4px', border: '1px solid #ddd' }}>
                                        {att.icon && <img src={att.icon} alt="icon" style={{ width: '20px' }} />}
                                        <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                            {att.title}
                                        </a>
                                        <Button isSmall variant="link" isDestructive onClick={() => removeAttachment(att.id)}>
                                            {__('Remove', 'es-scrum')}
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <MediaUploadCheck>
                            <MediaUpload
                                onSelect={handleMediaSelect}
                                render={({ open }) => (
                                    <Button variant="secondary" onClick={open} icon="paperclip">
                                        {__('Add Attachment', 'es-scrum')}
                                    </Button>
                                )}
                            />
                        </MediaUploadCheck>
                    </div>

                    {!isNew && (
                        <div style={{ marginTop: '24px' }}>
                            <hr style={{ margin: '16px 0', borderColor: '#eee' }} />
                            <CommentThread taskId={task.id} />
                        </div>
                    )}
                </div>

                <div style={{ flex: '1', minWidth: '200px', background: '#fafafa', padding: '15px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                    <SelectControl
                        label={__('Status', 'es-scrum')}
                        value={status}
                        options={STATUS_OPTIONS}
                        onChange={setStatus}
                    />
                    <SelectControl
                        label={__('Priority', 'es-scrum')}
                        value={priority}
                        options={PRIORITY_OPTIONS}
                        onChange={setPriority}
                    />
                    <SelectControl
                        label={__('Type', 'es-scrum')}
                        value={type}
                        options={TYPE_OPTIONS}
                        onChange={setType}
                    />
                    <SelectControl
                        label={__('Assignee', 'es-scrum')}
                        value={assigneeId}
                        options={userOptions}
                        onChange={setAssigneeId}
                    />
                    <TextControl
                        label={__('Program Group', 'es-scrum')}
                        value={programSlug}
                        onChange={setProgramSlug}
                        help={__('Leave blank to use your default program group', 'es-scrum')}
                    />
                    <TextControl
                        label={__('Story Points', 'es-scrum')}
                        type="number"
                        min={0}
                        value={storyPoints}
                        onChange={setStoryPoints}
                    />
                    <TextControl
                        label={__('Due Date', 'es-scrum')}
                        type="date"
                        value={dueDate}
                        onChange={setDueDate}
                    />
                    <LabelFilter selectedLabels={selectedLabels} setSelectedLabels={setSelectedLabels} inNewForm={true} />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '15px' }}>
                <div>
                    {!isNew && (
                        <Button variant="tertiary" isDestructive onClick={handleDelete} disabled={isSaving || isDeleting} isBusy={isDeleting}>
                            {__('Delete Task', 'es-scrum')}
                        </Button>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Button variant="tertiary" onClick={onClose} disabled={isSaving || isDeleting}>
                        {__('Cancel', 'es-scrum')}
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={isSaving || isDeleting} isBusy={isSaving}>
                        {isNew ? __('Create Task', 'es-scrum') : __('Save Changes', 'es-scrum')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default TaskModal;
