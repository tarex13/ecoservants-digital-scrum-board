import { useState, useEffect, useCallback, memo } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { Spinner, Button, Card, CardBody, CardHeader } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import SprintFilter from './SprintFilter';
import SprintManager from './SprintManager';
import BoardConfigModal from './BoardConfigModal';
import UserProfileModal from './UserProfileModal';
import { defaultConfig } from '../utils/defaultConfig';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskModal from './TaskModal';
import ShortcutsInfoModal from './ShortcutsInfoModal';
import TaskQuickAssign from './TaskQuickAssign';

const COLUMNS = {
    backlog: { label: 'Backlog', color: '#ddd' },
    todo: { label: 'To Do', color: '#dba617' },
    'in-progress': { label: 'In Progress', color: '#2271b1' },
    done: { label: 'Done', color: '#00a32a' },
};

const PRIORITY_COLORS = {
    high: '#d63638',
    medium: '#dba617',
    low: '#00a32a',
};


const ScrumBoard = () => {
    const [tasks, setTasks] = useState([]);
    const [config, setConfig] = useState(defaultConfig);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSprintId, setSelectedSprintId] = useState(null);
    const [sprintManagerOpen, setSprintManagerOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);    
    const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
    const [showTaskQuickAssign, setShowTaskQuickAssign] = useState(false);
    const [keyboardSelectedColumn, setKeyboardSelectedColumn] = useState(null);
    const [keyboardSelectedTaskId, setKeyboardSelectedTaskId] = useState(null);

    // Task detail modal — store ID, derive task from live array
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [isCreatingTask, setIsCreatingTask] = useState(false);

    // Board config modal
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // User profile modal
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [profileUserId, setProfileUserId] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    const fetchTasks = useCallback(() => {
        setIsLoading(true);
        let path = '/es-scrum/v1/tasks?per_page=100';
        if (selectedSprintId) {
            path += `&sprint_id=${selectedSprintId}`;
        }
        apiFetch({ path })
            .then((data) => {
                setTasks(data);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setError(err.message);
                setIsLoading(false);
            });
    }, [selectedSprintId]);

    useEffect(() => {
        // Fetch tasks + config + current user in parallel
        Promise.all([
            apiFetch({ path: '/es-scrum/v1/config' }).catch(() => null),
            apiFetch({ path: '/wp/v2/users/me' }).catch(() => null),
        ]).then(([configData, userData]) => {
            if (configData) setConfig(configData);
            if (userData) setCurrentUserId(userData.id);
        });
    }, []);
    useEffect(()=>{
        let viewed = window.localStorage.getItem("shortcutsInfoViewed");
        if(viewed){
            return;
        }
        try{
            window.localStorage.setItem("shortcutsInfoViewed", true);
        }catch(err){
            console.log(err.message);
        }
        openShortcutsInfoModal();
    }, [])

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleSprintChange = (sprintId) => {
        setSelectedSprintId(sprintId);
    };

    const handleSprintDataChange = () => {
        setRefreshKey((k) => k + 1);
        fetchTasks();
    };

    const openModal = useCallback((task) => {
        setSelectedTaskId(task.id);
    }, []);

    const closeModal = useCallback(() => {
        setSelectedTaskId(null);
    }, []);

    const openShortcutsInfoModal = () => {
        setShortcutsModalOpen(true);
    }

    const closeShortcutsInfoModal = () => {
        setShortcutsModalOpen(false);
    }

    const handleProfileClick = useCallback((userId) => {
        setProfileUserId(userId);
        setIsProfileOpen(true);
    }, []);

    const openMyProfile = () => {
        if (currentUserId) {
            setProfileUserId(currentUserId);
            setIsProfileOpen(true);
        }
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;

        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const taskId = String(draggableId);
        const newStatus = destination.droppableId;

        // Optimistically update (compare as strings — API returns id as string)
        setTasks(prev => prev.map(t => String(t.id) === taskId ? { ...t, status: newStatus } : t));

        // API patch
        apiFetch({
            path: `/es-scrum/v1/tasks/${parseInt(taskId, 10)}`,
            method: 'PATCH',
            data: { status: newStatus }
        }).catch(err => {
            console.error('Failed to move task', err);
            fetchTasks(); // Revert on failure
        });
    };

    const saveConfig = (newConfig) => {
        setIsLoading(true);
        apiFetch({
            path: '/es-scrum/v1/config',
            method: 'POST',
            data: newConfig,
        })
            .then(() => {
                setConfig(newConfig);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setError(__('Failed to save configuration.', 'es-scrum'));
                setIsLoading(false);
            });
    };

    const quickAssign = (taskId, assigneeId) => {
        const taskData = {
            assignee_id: assigneeId ? parseInt(assigneeId, 10) : null
        };

        const path = `/es-scrum/v1/tasks/${taskId}`;

        apiFetch({ path, method: 'PATCH', data: taskData })
            .then((savedTask) => {
                setShowTaskQuickAssign(false);
            })
            .catch((err) => {
                console.error(err);
            });
    }

    if (error) {
        return <div className="notice notice-error"><p>{error}</p></div>;
    }

    // Organize tasks into columns
    const columns = {};
    Object.keys(COLUMNS).forEach((key) => { columns[key] = []; });
    tasks.forEach((task) => {
        const status = task.status || 'backlog';
        if (columns[status]) {
            columns[status].push(task);
        } else {
            columns.backlog.push(task);
        }
    });

    // Derive selected task from live array (avoids stale snapshot)
    const selectedTask = selectedTaskId
        ? tasks.find((t) => t.id === selectedTaskId) || null
        : null;

    useEffect(() => {
        const handleKeyDown = (e) => {
            // ignore when typing in editable fields
            const tag = e.target?.tagName;
            const columnsArray = Object.entries(columns);
            const isEditable =
                tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable;
            if (isEditable) return;
            if(!config.useKeyboardShortcuts) return;
            if(e.key == '/'){
                //! Implementation for the task search 
                // This is currently being implemented by @toofancodes
            }else if(e.key == 'N' || e.key == 'n'){
                setIsCreatingTask(true);
            }else if(e.key == 'A' || e.key == 'a'){
                // Implementation for the quick task assign
                if(keyboardSelectedTaskId != null){
                    setShowTaskQuickAssign(true);
                }
            }else if(e.key == 'ArrowRight'){
                    // If no current selected column start from the first one
                if(keyboardSelectedColumn == null){
                    setKeyboardSelectedColumn(0);
                }else{
                    setKeyboardSelectedColumn(s => ((s + 1) % Object.entries(COLUMNS).length))
                }
                // Implementation for selecting a column
            }else if(e.key == 'ArrowLeft'){
                if(keyboardSelectedColumn == null){
                    // If no current selected column start from the first one
                    setKeyboardSelectedColumn(0);
                    //  safeguard against negative numbers
                }else if(keyboardSelectedColumn == 0){
                    setKeyboardSelectedColumn(Object.entries(COLUMNS).length - 1);
                }else{
                    setKeyboardSelectedColumn(s => ((s - 1) % Object.entries(COLUMNS).length))
                }
                // Implementation for selecting a column
            }else if(e.key == 'ArrowUp'){
                if(keyboardSelectedColumn == null){
                    // Set the first column as the selected column
                    setKeyboardSelectedColumn(0);
                    // set the first task in the first column as the selected task
                    setKeyboardSelectedTaskId(columnsArray[0][1][0]?.id);
                // if user is already at the top most task
                }else if(keyboardSelectedTaskId == columnsArray[keyboardSelectedColumn][1][0].id){
                    // then set the selected task id to the bottom most task to achieve an infiinte scroll loop
                    setKeyboardSelectedTaskId(columnsArray[keyboardSelectedColumn][1][columnsArray[keyboardSelectedColumn][1].length - 1]?.id);
                }else{
                    // else just find the set selected task to task above current selected task
                    setKeyboardSelectedTaskId(columnsArray[keyboardSelectedColumn][1][columnsArray[keyboardSelectedColumn][1].findIndex(el=>el.id == keyboardSelectedTaskId) - 1]?.id);
                }
                // Implementation for selecting a column
            }else if(e.key == 'ArrowDown'){
                if(keyboardSelectedColumn == null){
                    // Set the first column as the selected column
                    setKeyboardSelectedColumn(0);
                    // set the last task in the first column as the selected task
                    setKeyboardSelectedTaskId(columnsArray[0][1][columnsArray[0][1].length - 1]?.id);
                // if user is already at the bottom most task
                }else if(keyboardSelectedTaskId == columnsArray[keyboardSelectedColumn][1][columnsArray[0][1].length - 1]?.id){
                    // then set the selected task id to the top most task to achieve an infiinte scroll loop
                    setKeyboardSelectedTaskId(columnsArray[keyboardSelectedColumn][1][0]?.id);
                }else{
                    // else just find the set selected task to task above current selected task
                    setKeyboardSelectedTaskId(columnsArray[keyboardSelectedColumn][1][columnsArray[keyboardSelectedColumn][1].findIndex(el=>el.id == keyboardSelectedTaskId) + 1]?.id);
                }
                // Implementation for selecting a column
            }
            // handle keys
            if (e.key === 'Escape') {
                //console.log('Global: Escape pressed');
            } else if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                //console.log('Global: Cmd/Ctrl+K pressed');
            } else {
                //console.log('Global key:', e.key);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [keyboardSelectedColumn, columns, keyboardSelectedTaskId]);
    

    return (
        <div className="es-scrum-board">
            {/* Toolbar */}
            <div style={styles.toolbar}>
                <SprintFilter
                    key={refreshKey}
                    selectedSprintId={selectedSprintId}
                    onSprintChange={handleSprintChange}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                        variant="primary"
                        onClick={() => setIsCreatingTask(true)}
                        icon="plus"
                    >
                        {__('Create Task', 'es-scrum')}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={openMyProfile}
                    >
                        {__('My Profile', 'es-scrum')}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setIsConfigOpen(true)}
                    >
                        {__('Customize Board', 'es-scrum')}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setSprintManagerOpen(true)}
                        icon="calendar-alt"
                    >
                        {__('Manage Sprints', 'es-scrum')}
                    </Button>
                </div>
            </div>

            {/* Board columns */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><Spinner /></div>
            ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div style={styles.board}>
                        {Object.entries(COLUMNS).map(([status, meta], colIndex) => (
                            <Droppable key={status} droppableId={status}>
                                {(provided, snapshot) => (
                                    <div 
                                        onClick={()=>setKeyboardSelectedColumn(colIndex)}
                                        ref={provided.innerRef} 
                                        {...provided.droppableProps}
                                        style={{ ...styles.column, background: snapshot.isDraggingOver ? '#e3f2fd' : '#f0f0f1', border: keyboardSelectedColumn == colIndex ? '2px solid #d0d0d0' : '' }}
                                    >
                                        <div style={{ ...styles.columnHeader, borderBottom: `3px solid ${meta.color}` }}>
                                            <span>{meta.label}</span>
                                            <span style={styles.count}>{columns[status].length}</span>
                                        </div>
                                        <div style={styles.columnBody}>
                                            {columns[status].length === 0 && (
                                                <div style={styles.emptyCol}>No tasks</div>
                                            )}
                                            {columns[status].map((task, index) => (
                                                <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={()=>{setKeyboardSelectedTaskId(task.id)}}
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                                opacity: snapshot.isDragging ? 0.8 : 1
                                                            }}
                                                        >
                                                            <TaskCard
                                                                task={task}
                                                                keyboardSelected={keyboardSelectedTaskId == task.id && colIndex == keyboardSelectedColumn}
                                                                onViewDetails={openModal}
                                                                onProfileClick={handleProfileClick}
                                                            />
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        ))}
                    </div>
                </DragDropContext>
            )}

            {/* Sprint Manager Panel */}
            <SprintManager
                isOpen={sprintManagerOpen}
                onClose={() => setSprintManagerOpen(false)}
                onSprintChange={handleSprintDataChange}
            />

            {/* Task Detail Modal */}
            {(selectedTask || isCreatingTask) && (
                <TaskModal 
                    task={selectedTask}
                    onClose={() => { closeModal(); setIsCreatingTask(false); }}
                    onSave={(saved) => {
                         setTasks(prev => {
                             const idx = prev.findIndex(t => t.id === saved.id);
                             if (idx > -1) {
                                 const copy = [...prev];
                                 copy[idx] = saved;
                                 return copy;
                             }
                             return [saved, ...prev];
                         });
                         closeModal(); 
                         setIsCreatingTask(false);
                    }}
                    onDelete={(deletedId) => {
                         setTasks(prev => prev.filter(t => String(t.id) !== String(deletedId)));
                         closeModal();
                         setIsCreatingTask(false);
                    }}
                />
            )}

            {shortcutsModalOpen && 
                <ShortcutsInfoModal
                    onClose={()=>setShortcutsModalOpen(false)}
                    config={config}
                    onSave={saveConfig}
                />
            }

            {showTaskQuickAssign &&
                <TaskQuickAssign 
                    onClose={()=>setShowTaskQuickAssign(false)}
                    taskId={keyboardSelectedTaskId}
                    onSave={quickAssign}
                    tasks={tasks}
                />
            }

            {/* Board Config Modal */}
            <BoardConfigModal
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                config={config}
                onSave={saveConfig}
                openShortcutsMenu={()=>setShortcutsModalOpen(true)}
            />

            {/* User Profile Modal */}
            <UserProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                userId={profileUserId}
            />
        </div>
    );
};

const TaskCard = memo(({ task, onViewDetails, onProfileClick, keyboardSelected }) => {
    return (
        <Card size="small" style={{...styles.card, border: keyboardSelected ? '3px solid #ddd' : '1px solid #d0d0d0'}}>
            <CardHeader style={{ padding: '8px 12px' }}>
                <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '13px' }}>{task.title}</strong>
                    {task.sprint_id && (
                        <span style={styles.sprintBadge}>Sprint</span>
                    )}
                </div>
                {task.priority && (
                    <span style={{
                        ...styles.priorityDot,
                        background: PRIORITY_COLORS[task.priority] || '#ccc',
                    }}
                        title={task.priority}
                    />
                )}
            </CardHeader>
            {task.description && (
                <CardBody style={{ padding: '6px 12px 4px' }}>
                    <div style={styles.description}>{task.description}</div>
                </CardBody>
            )}
            <div style={styles.cardFooter}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {task.story_points && (
                        <span style={styles.points}>{task.story_points} pts</span>
                    )}
                    {task.assignee_id && (
                        <span
                            style={{ ...styles.assignee, cursor: 'pointer' }}
                            onClick={() => onProfileClick(task.assignee_id)}
                            title={task.assignee || __('View Profile', 'es-scrum')}
                        >
                            👤
                        </span>
                    )}
                </div>
                <Button
                    isLink
                    style={{ fontSize: '12px', height: 'auto', padding: '0' }}
                    onClick={() => onViewDetails(task)}
                >
                    {__('View Details', 'es-scrum')}
                </Button>
            </div>
        </Card>
    );
});



const styles = {
    toolbar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: '16px',
        gap: '12px',
        flexWrap: 'wrap',
    },
    board: {
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
    },
    column: {
        flex: 1,
        minWidth: '200px',
        background: '#f0f0f1',
        borderRadius: '6px',
        overflow: 'hidden',
    },
    columnHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px',
        fontWeight: 600,
        fontSize: '14px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        background: '#e8e8e8',
    },
    count: {
        background: '#fff',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '12px',
        fontWeight: 700,
    },
    columnBody: {
        padding: '8px',
        minHeight: '100px',
    },
    emptyCol: {
        textAlign: 'center',
        color: '#999',
        padding: '20px 0',
        fontSize: '13px',
    },
    card: {
        marginBottom: '8px',
        background: '#fff',
    },
    description: {
        fontSize: '12px',
        color: '#555',
        lineHeight: 1.4,
        maxHeight: '40px',
        overflow: 'hidden',
    },
    sprintBadge: {
        display: 'inline-block',
        marginLeft: '6px',
        fontSize: '10px',
        padding: '1px 6px',
        background: '#2271b1',
        color: '#fff',
        borderRadius: '8px',
        verticalAlign: 'middle',
    },
    priorityDot: {
        display: 'inline-block',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        flexShrink: 0,
    },
    cardFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 12px 10px',
        fontSize: '12px',
        color: '#757575',
    },
    points: {
        background: '#f0f0f1',
        padding: '1px 6px',
        borderRadius: '4px',
        fontWeight: 600,
        fontSize: '11px',
    },
    assignee: {
        fontSize: '14px',
    },
};

export default ScrumBoard;
