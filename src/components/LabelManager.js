import { useState, useEffect, useCallback } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { Button, TextControl, TextareaControl, Spinner, ColorPicker, } from '@wordpress/components';
import { Icon, pencil, cancelCircleFilled, trash, check } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';

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
        description: '',
        color: '',
    });

    const fetchLabels = useCallback(() => {
        setIsLoading(true);
        apiFetch({ path: '/es-scrum/v1/labels?per_page=50&filter=popular' })
            .then((data) => {
                setLabels(data);
                setIsLoading(false);
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
        if (isOpen) fetchLabels();
    }, [isOpen, fetchLabels]);

    const resetForm = () => {
        setFormData({ name: '', description: '', color: '' });
        setEditingId(null);
        setShowForm(false);
    };

    
    const handleEditSave = async (labelId, formData) => {
        if (!formData.name.trim()) return;
        const data = apiFetch({ path: `/es-scrum/v1/labels/${labelId}`, method: 'PUT', data: formData })
            .then(() => {
                fetchLabels();
                if (onLabelChange) onLabelChange();
            })
            .catch((err) => console.error('Edit failed:', err));
    };

    const handleSave = () => {
        if (!formData.name.trim()) return;
        setSaving(true);

        const request = apiFetch({ path: '/es-scrum/v1/labels', method: 'POST', data: formData });

        request
            .then(() => {
                resetForm();
                fetchLabels();
                if (onLabelChange) onLabelChange();
            })
            .catch((err) => console.error('Save failed:', err))
            .finally(() => setSaving(false));
    };

    const handleLabelDelete = (labelId) => {
        if (!window.confirm(`Permanently delete label? This cannot be undone.`)) return;
        apiFetch({ path: `/es-scrum/v1/labels/${labelId}`, method: 'DELETE' })
            .then(() => {
                fetchLabels();
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
                        <h3 style={{ marginTop: 0 }}>{editingId ? __('Edit Label', 'es-scrum') : __('New Label', 'es-scrum')}</h3>
                        <TextControl
                            label="Label Name"
                            value={formData.name}
                            onChange={(val) => setFormData({ ...formData, name: val })}
                            placeholder={__("Label Name", 'es-scrum')}
                        />
                        <TextControl
                            label="Label Description"
                            value={formData.description}
                            onChange={(val) => setFormData({ ...formData, description: val })}
                            placeholder={__("Label Description", 'es-scrum')}
                        />
                        <label style={styles.label}>{__('Label Color', 'es-scrum')}</label>
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
                                    placeholder={__('Enter Color', 'es-scrum')}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    style={styles.label}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button variant="primary" onClick={handleSave} isBusy={saving} disabled={saving}>
                                {__("Create", 'es-scrum')}
                            </Button>
                            <Button variant="tertiary" onClick={resetForm}>{__("Cancel", 'es-scrum')}</Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        variant="primary"
                        onClick={() => { setShowForm(true); }}
                        style={{ margin: '16px' }}
                    >
                        + {__("New Label", 'es-scrum')}
                    </Button>
                )}


                {/* Label list */}
                <div style={styles.list}>
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}><Spinner /></div>
                    ) : (
                        <>
                            {labels.length === 0 && (
                                <p style={styles.empty}>{__("No Lables yet. Create one to get started.", 'es-scrum')}</p>
                            )}
                            <div style={{display: 'flex', gap: '4px', flexDirection: 'column', paddingLeft: '13px', alignItems: 'center'}}>
                                {labels.map((label) => (
                                    <LabelCard 
                                        label={label}
                                        handleEditSave={handleEditSave}
                                        handleLabelDelete={handleLabelDelete}
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

const LabelCard = ({ label, handleLabelDelete, handleEditSave }) => {
    const [formData, setFormData] = useState({
        name: label.name,
        description: label.description,
        color: label.color,
    });
    
    const resetForm = () => {
        setFormData({ name: '', description: '', color: '' });
        setEditingLabel(false);
    };
    const [editingLabel, setEditingLabel] = useState(false);

    return (
        <>
        {!editingLabel ? 
            <div style={{width: '100%', padding: '16px 3px',  boxShadow: '4px 3px 10px 0px rgba(0,0,0,0.05)', borderLeft: `4px solid ${label.color}`, margin: '5px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <span key={label.id} style={{ padding: '2px 6px', fontSize: 'medium', borderLeft: '3px solid ' + label.color, color: label.color, borderRadius: '5px', }}>{label.name}</span>
                <span>{label.description}</span>
                <div style={{display: 'flex', gap: '4px', paddingRight: '5px'}}>
                    <div><Icon icon={pencil} style={{cursor: 'pointer'}} onClick={()=>setEditingLabel(true)} /></div>
                    <div><Icon icon={trash} style={{cursor: 'pointer'}} onClick={()=>{setEditingLabel(false);handleLabelDelete(label.id);}} /></div>
                </div>
            </div>
            :
            <div style={{width: '100%', padding: '16px 3px',  boxShadow: '4px 3px 10px 0px rgba(0,0,0,0.05)', borderLeft: `4px solid ${label.color}`, margin: '5px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', width: '80%'}}>
                    <TextControl
                        label={__("Label Name", 'es-scrum')}
                        value={formData.name}
                        onChange={(val)=>{setFormData(state => {return {...state, name: val}})}}
                        placeholder={__("Label Name", 'es-scrum')}
                    />
                    <TextControl
                        label={__("Label Description", 'es-scrum')}
                        value={formData.description}
                        onChange={(val)=>{setFormData(state => {return {...state, description: val}})}}
                        placeholder={__("Enter Label Description", 'es-scrum')}
                    />
                    <label style={styles.label}>{__("Choose Color", 'es-scrum')}</label>
                    <input type='color' value={formData.color.length == 7 ? formData.color : '#ffffff' } onChange={(e)=>{setFormData(state => {return {...state, color: e.target.value}})}} style={{width: '100%'}} />
                    <input value={formData.color} onInput={(e)=>{setFormData(state => {return {...state, color: e.target.value}})}} style={{width: '100%'}} placeholder={__('Enter Color', 'es-scrum')} />
                </div>
                <div style={{display: 'flex', padding: '10px', alignItems: 'center'}}>
                    <div style={{display: 'flex', cursor: 'pointer'}} onClick={()=>{resetForm()}}><Button style={{fontSize: '16px', padding: '2px'}} >X</Button></div>
                    <div style={{display: 'flex', cursor: 'pointer'}}><Button icon={check} style={{padding: '2px'}} onClick={()=>{handleEditSave(label.id, formData)}} /></div>
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
