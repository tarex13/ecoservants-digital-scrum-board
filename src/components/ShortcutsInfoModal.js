import { useState, useEffect } from '@wordpress/element';
import { Modal, Button, TextControl, TextareaControl, SelectControl, Spinner, Icon } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import CommentThread from './CommentThread';

const ShortcutsInfoModal = ({ onClose, config, onSave }) => {
    const [localConfig, setLocalConfig] = useState(config);
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
            title={__('Keyboard Shortcuts Menu', 'es-scrum')}
            onRequestClose={onClose}
            shouldCloseOnClickOutside={true}
            style={{ maxWidth: '800px', width: '90%' }}
        >
            
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: '2', minWidth: '300px' }}>
                    

                    <div style={styles.div}>
                        <span style={styles.span}>{__('Create New Task', 'es-scrum')}</span>
                        <Icon icon={'arrow-right-alt2'} style={styles.button.square_big} />
                        <Button variant="secondary" style={styles.button.rounded}>N</Button>
                    </div>
                    <div style={styles.div}>
                        <span style={styles.span}>{__('Open Search', 'es-scrum')}</span>
                        <Icon icon={'arrow-right-alt2'} style={styles.button.square_big} />
                        <Button variant="secondary" style={styles.button.square_small}>/</Button>
                    </div>
                    <div style={styles.div}>
                        <span style={styles.span}>{__('Move between columns', 'es-scrum')}</span>
                        <Icon icon={'arrow-right-alt2'} style={styles.button.square_big} />
                        <div style={{display: 'flex', gap: '10px'}}>
                            <Button variant="secondary" icon={'arrow-right-alt'} style={styles.button.square_big} />
                            <Button variant="secondary" icon={'arrow-left-alt'} style={styles.button.square_big} />
                        </div>
                    </div>
                    <div style={styles.div}>
                        <span style={styles.span}>{__('Move between tasks', 'es-scrum')}</span>
                        <Icon icon={'arrow-right-alt2'} style={styles.button.square_big} />
                        <div style={{display: 'flex', gap: '10px'}}>
                            <Button variant="secondary" icon={'arrow-up-alt'} style={styles.button.square_big} />
                            <Button variant="secondary" icon={'arrow-down-alt'} style={styles.button.square_big} />
                        </div>
                    </div>
                    <div style={styles.div}>
                        <span style={styles.span}>{__('Quick Assign', 'es-scrum')}</span>
                        <Icon icon={'arrow-right-alt2'} style={styles.button.square_big} />
                        <Button variant="secondary" style={styles.button.rounded}>A</Button>
                    </div>
                    <div style={styles.div}>
                        <span style={styles.span}>{__('Create New Task', 'es-scrum')}</span>
                        <Icon icon={'arrow-right-alt2'} style={styles.button.square_big} />
                        <span>Create New Task</span>
                    </div>

                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'end', marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '15px' }}>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <Button variant="primary" onClick={()=>onSave({...localConfig, useKeyboardShortcuts: !localConfig.useKeyboardShortcuts})}>
                        {__(localConfig.useKeyboardShortcuts ? 'Disable Shortcuts' : 'Enable Shortcuts', 'es-scrum')}
                    </Button>
                    <Button variant="primary" onClick={onClose}>
                        {__('Close', 'es-scrum')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ShortcutsInfoModal;