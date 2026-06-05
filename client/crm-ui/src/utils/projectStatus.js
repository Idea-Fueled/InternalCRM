export const getProjectStatus = (project) => {
    if (!project) return "Upcoming";

    // 1. Completed check: All project tasks completed OR Project manually marked completed
    const totalTasks = project.tasks?.length || 0;
    const completedTasks = project.tasks?.filter(t => t.status === "Completed" || t.status === "Done").length || 0;
    const allTasksCompleted = totalTasks > 0 && completedTasks === totalTasks;
    const isManuallyCompleted = project.status === "Completed";
    
    if (allTasksCompleted || isManuallyCompleted) {
        return "Completed";
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const start = project.startDate ? new Date(project.startDate) : null;
    if (start) start.setHours(0, 0, 0, 0);

    const end = project.endDate ? new Date(project.endDate) : null;
    if (end) end.setHours(0, 0, 0, 0);

    // 2. Upcoming check: Current date is before project start date
    if (start && currentDate < start) {
        return "Upcoming";
    }

    // 3. Overdue check: Current date is past project end date and project is not completed
    if (end && currentDate > end) {
        return "Overdue";
    }

    // 4. In Progress check: Current date is between start date and end date and project is not completed
    return "In Progress";
};

export const getProjectStatusDetails = (status) => {
    switch (status) {
        case "Upcoming":
            return {
                label: "Upcoming",
                color: "grey",
                emoji: "🩶",
                badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
                borderClass: "border-l-slate-400",
                textClass: "text-slate-500",
                dotColor: "bg-slate-400"
            };
        case "Completed":
            return {
                label: "Completed",
                color: "green",
                emoji: "🟢",
                badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-200",
                borderClass: "border-l-emerald-500",
                textClass: "text-emerald-600",
                dotColor: "bg-emerald-500"
            };
        case "Overdue":
            return {
                label: "Overdue",
                color: "red",
                emoji: "🔴",
                badgeClass: "bg-rose-50 text-rose-600 border-rose-200",
                borderClass: "border-l-rose-500",
                textClass: "text-rose-600",
                dotColor: "bg-rose-500"
            };
        case "In Progress":
        default:
            return {
                label: "In Progress",
                color: "blue",
                emoji: "🔵",
                badgeClass: "bg-blue-50 text-blue-600 border-blue-200",
                borderClass: "border-l-blue-500",
                textClass: "text-blue-600",
                dotColor: "bg-blue-500"
            };
    }
};
