// Importing necessary modules and libraries
import React, { useEffect, useState } from 'react';
import { useUploadState } from '../hooks/useUploadState';  
import { useProjectDetail } from '../hooks/useProjectDetail';

// Type definitions
interface ProjectDetailProps {
    projectId: string;
}

// Main ProjectDetail component setup
const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId }) => {
    const { state, actions } = useUploadState(); // Handling upload state
    const { data, error, loading } = useProjectDetail(projectId); // Business logic separated into a hook

    // Effect to handle side effects
    useEffect(() => {
        if (error) {
            console.error('Error fetching project details:', error);
        }
    }, [error]);

    // Render logic with conditions
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <div>
            <h1>{data.title}</h1>
            {/* Upload logic refactored with new utils */}
            <input type='file' onChange={(e) => actions.uploadFile(e.target.files[0])} />
            {/* Other logical sections can be added here */}
        </div>
    );
};

export default ProjectDetail;