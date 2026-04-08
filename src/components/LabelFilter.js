import { useState, useEffect, useCallback } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { FormTokenField, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const LabelFilter = ({ selectedLabels, setSelectedLabels, inNewForm=false, refreshKey=null }) => {
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
    }, [refreshKey]);

    const suggestions = inNewForm ? labels?.map((l) => {return {label: l.name, value: l.id}}) : labels?.map((l) => l.name);

    if(inNewForm){
        return (
            <SelectControl 
                    __next40pxDefaultSize
                    label={__("Add Labels", 'es-scrum')}
                    help={__("Hold down Ctrl (Windows) or Command (Mac) to select multiple options.", 'es-scrum')}
                    value={ selectedLabels }
                    options={ suggestions }
                    multiple
                    onChange={ setSelectedLabels }
                />
        )
    }else{
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
        )
    }
};

export default LabelFilter;
