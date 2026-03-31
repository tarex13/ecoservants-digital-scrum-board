import { useState, useEffect, useCallback } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { Button, TextControl, TextareaControl, Spinner, } from '@wordpress/components';
import { Icon, pencil, cancelCircleFilled, trash, check } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';
import SprintAnalytics from './SprintAnalytics';

const STATUS_LABELS = {
    planned: { label: 'Planned', color: '#2271b1' },
    active: { label: 'Active', color: '#00a32a' },
    completed: { label: 'Completed', color: '#757575' },
    archived: { label: 'Archived', color: '#b32d2e' },
};

const LabelManager = ({ isOpen, onClose, onLabelChange }) => {
    const [sprints, setSprints] = useState([]);
    const [labels, setLabels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        desc: '',
        color: '',
    });

    // Analytics
    const [analyticsId, setAnalyticsId] = useState(null);

    const fetchSprints = useCallback(() => {
        setIsLoading(true);
        apiFetch({ path: '/es-scrum/v1/labels?per_page=50&filter=popular' })
            .then((data) => {
                setLabels(data);
                setIsLoading(false);
                console.log(data);
            })
            .catch((err) => {
                console.error('Failed to fetch labels:', err);
                setIsLoading(false);
            });
        apiFetch({ path: '/es-scrum/v1/sprints?per_page=50&' })
            .then((data) => {
                setSprints(data);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error('Failed to fetch sprints:', err);
                setIsLoading(false);
            });
    }, []);

    useEffect(() => {
        if (isOpen) fetchSprints();
    }, [isOpen, fetchSprints]);

    const resetForm = () => {
        setFormData({ name: '', start_date: '', end_date: '', goal: '', status: 'planned' });
        setEditingId(null);
        setShowForm(false);
    };

    const handleSave = () => {
        if (!formData.name.trim()) return;
        setSaving(true);

        const request = editingId
            ? apiFetch({ path: `/es-scrum/v1/sprints/${editingId}`, method: 'PATCH', data: formData })
            : apiFetch({ path: '/es-scrum/v1/sprints', method: 'POST', data: formData });

        request
            .then(() => {
                resetForm();
                fetchSprints();
                if (onLabelChange) onLabelChange();
            })
            .catch((err) => console.error('Save failed:', err))
            .finally(() => setSaving(false));
    };

    const handleEdit = (sprint) => {
        setFormData({
            name: sprint.name,
            start_date: sprint.start_date ? sprint.start_date.split(' ')[0] : '',
            end_date: sprint.end_date ? sprint.end_date.split(' ')[0] : '',
            goal: sprint.goal || '',
            status: sprint.status,
        });
        setEditingId(sprint.id);
        setShowForm(true);
        setAnalyticsId(null);
    };

    const handleArchive = (sprint) => {
        if (!window.confirm(`Archive "${sprint.name}"? Tasks will be unassigned from this sprint.`)) return;
        apiFetch({ path: `/es-scrum/v1/sprints/${sprint.id}`, method: 'PATCH', data: { status: 'archived' } })
            .then(() => {
                fetchSprints();
                if (onLabelChange) onLabelChange();
            })
            .catch((err) => console.error('Archive failed:', err));
    };

    const handleDelete = (sprint) => {
        if (!window.confirm(`Permanently delete "${sprint.name}"? This cannot be undone.`)) return;
        apiFetch({ path: `/es-scrum/v1/sprints/${sprint.id}`, method: 'DELETE' })
            .then(() => {
                fetchSprints();
                if (onLabelChange) onLabelChange();
            })
            .catch((err) => console.error('Delete failed:', err));
    };

    if (!isOpen) return null;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={styles.header}>
                    <h2 style={{ margin: 0 }}>{__('Label Manager', 'es-scrum')}</h2>
                    <Button icon="no-alt" onClick={onClose} label="Close" />
                </div>

                {/* Create / Edit Form */}
                {showForm ? (
                    <div style={styles.form}>
                        <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Label' : 'New Label'}</h3>
                        <TextControl
                            label="Label Name"
                            value={formData.name}
                            onChange={(val) => setFormData({ ...formData, name: val })}
                            placeholder="Label Name"
                        />
                        <TextControl
                            label="Label Description"
                            value={formData.desc}
                            onChange={(val) => setFormData({ ...formData, desc: val })}
                            placeholder="Label Description"
                        />
                        <label style={styles.label}>Label Color</label>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    style={styles.label}
                                />
                            </div>
                            <div style={{ flex: 3 }}>
                                <input
                                    type="text"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: color })}
                                    style={styles.label}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button variant="primary" onClick={handleSave} isBusy={saving} disabled={saving}>
                                {editingId ? 'Update' : 'Create'}
                            </Button>
                            <Button variant="tertiary" onClick={resetForm}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        variant="primary"
                        onClick={() => { setShowForm(true); setAnalyticsId(null); }}
                        style={{ margin: '16px' }}
                    >
                        + New Label
                    </Button>
                )}


                {/* Label list */}
                <div style={styles.list}>
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}><Spinner /></div>
                    ) : (
                        <>
                            {labels.length === 0 && (
                                <p style={styles.empty}>No Lables yet. Create one to get started.</p>
                            )}
                            <div style={{display: 'flex', gap: '4px', flexDirection: 'column', paddingLeft: '13px', alignItems: 'center'}}>
                                {labels.map((label) => (
                                    <LabelCard 
                                        label={label}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const LabelCard = ({ label }) => {
    const [labelName, setLabelName] = useState(label.name);
    const [labelDesc, setLabelDesc] = useState(label.desc || "Task Description");
    const [labelColor, setLabelColor] = useState(label.color);
    const [editingLabel, setEditingLabel] = useState(false);



    const handleEdit = () => {
        setEditingLabel(false);
    }

    const handleLabelDelete = () => {
        return null;
    }
    return (
        <>
        {!editingLabel ? 
            <div style={{width: '100%', padding: '16px 3px',  boxShadow: '4px 3px 10px 0px rgba(0,0,0,0.05)', borderLeft: `4px solid ${label.color}`, margin: '5px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <label key={label.id} style={{ padding: '2px 6px', fontSize: 'medium', borderLeft: '3px solid ' + label.color, color: label.color, borderRadius: '5px', }}>{label.name}</label>
                <label>This is the description for this task</label>
                <div style={{display: 'flex', gap: '4px'}}>
                    <div><Icon icon={pencil} style={{cursor: 'pointer'}} onClick={()=>setEditingLabel(true)} /></div>
                    <div><Icon icon={trash} style={{cursor: 'pointer'}} /></div>
                </div>
            </div>
            :
            <div style={{width: '100%', padding: '16px 3px',  boxShadow: '4px 3px 10px 0px rgba(0,0,0,0.05)', borderLeft: `4px solid ${label.color}`, margin: '5px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', width: '80%'}}>
                    <input value={labelName} onChange={(e)=>{setLabelName(e.target.value)}} style={{ padding: '2px 6px', fontSize: 'medium', borderLeft: '3px solid ' + label.color, color: label.color, borderRadius: '5px', outline: 'none', marginBottom: '5px' }} placeholder='Enter Label Name' />
                    <input value={labelDesc} onChange={(e)=>{setLabelDesc(e.target.value)}} style={{ padding: '2px 6px', fontSize: 'medium', borderLeft: '3px solid ' + label.color, color: label.color, borderRadius: '5px', outline: 'none' }} placeholder='Enter Label Description' />
                    <input type='color' value={labelColor.length == 7 ? labelColor : '#ffffff' } onChange={(e)=>{setLabelColor(e.target.value)}} style={{width: '100%'}} />
                    <input value={labelColor} onInput={(e)=>{setLabelColor(e.target.value)}} style={{width: '100%'}} placeholder='Enter Color' />
                </div>
                <div style={{display: 'flex', padding: '10px'}}>
                    <div style={{display: 'flex', gap: '4px', cursor: 'pointer'}}><Icon icon={trash} onClick={()=>setEditingLabel(false)} /></div>
                    <div style={{display: 'flex', gap: '4px', cursor: 'pointer'}}><Icon icon={check} onClick={handleEdit} /></div>
                </div>
            </div>
        }
        </>
        
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        background: 'rgba(0,0,0,0.3)',
        zIndex: 100000,
        display: 'flex',
        justifyContent: 'flex-end',
    },
    panel: {
        width: '420px',
        maxWidth: '90vw',
        background: '#fff',
        height: '100%',
        overflowY: 'auto',
        boxShadow: '-4px 0 12px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid #ddd',
        position: 'sticky',
        top: 0,
        background: '#fff',
        zIndex: 1,
    },
    form: {
        padding: '16px',
        borderBottom: '1px solid #eee',
        background: '#f9f9f9',
    },
    list: {
        flex: 1,
    },
    empty: {
        textAlign: 'center',
        color: '#757575',
        padding: '20px',
    },
    label: {
        display: 'block',
        fontSize: '11px',
        fontWeight: 500,
        marginBottom: '4px',
        textTransform: 'uppercase',
    },
};

export default LabelManager;
