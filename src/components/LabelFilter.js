import { useState, useEffect, useCallback } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { FormTokenField, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const LabelFilter = ({ selectedLabels, setSelectedLabels }) => {
    const [labels, setLabels] = useState([]);

    const fetchLabels = useCallback(() => {
        apiFetch({ path: '/es-scrum/v1/labels?filter=popular&per_page=20' })
            .then((data) => {
                setLabels(data);
            })
            .catch((err) => console.error('Failed to fetch labels for filter:', err));
    }, []);

    useEffect(() => {
        fetchLabels();
    }, []);

    // // Refresh when selected label changes
    // useEffect(() => {
    //     fetchLabels();
    // }, [selectedLabelId, fetchLabels]);

    const suggestions = labels.map((l) => l.name);

    return (
        <FormTokenField
            __experimentalAutoSelectFirstMatch
            __experimentalExpandOnFocus
            __nextHasNoMarginBottom
            maxSuggestions={6}
            maxLength={5}
            label={__("Label Filter", 'es-scrum')}
            onChange={(l) => setSelectedLabels(l)}
            suggestions={suggestions}
            value={selectedLabels}
        />

    );
};

const styles = {
    container: {
        marginBottom: '16px',
    },
    filterRow: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '12px',
    },
    goal: {
        marginTop: '8px',
        padding: '8px 12px',
        background: '#f0f6fc',
        border: '1px solid #c3d1e0',
        borderRadius: '4px',
        fontSize: '13px',
        color: '#1d2327',
    },
};

export default LabelFilter;
