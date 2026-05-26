import React from 'react'
import { Outlet, useSearchParams } from 'react-router-dom'
import ProjectDetailsSidebar from './ProjectDetailsSidebar'
import GlobalTaskDetailsSidebar from './GlobalTaskDetailsSidebar'

const Layout = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const taskId = searchParams.get('taskId');
    const projectId = searchParams.get('projectId');

    const handleClose = () => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('taskId');
        nextParams.delete('projectId');
        setSearchParams(nextParams, { replace: true });
    };

    return (
        <>
            <Outlet />

            {/* Global Task Details Sidebar (opens contextually on notification click) */}
            {taskId && (
                <GlobalTaskDetailsSidebar taskId={taskId} onClose={handleClose} />
            )}

            {/* Global Project Details Sidebar (opens contextually on notification click, unless task is also open) */}
            {projectId && !taskId && (
                <ProjectDetailsSidebar projectId={projectId} onClose={handleClose} />
            )}
        </>
    )
}

export default Layout