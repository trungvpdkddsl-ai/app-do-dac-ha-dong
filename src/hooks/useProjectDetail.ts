import { useMemo, useCallback } from 'react';
import { Project } from '../types';
import { getDeadlineStatus } from '../utils/stageHelpers';

export function useProjectDetail(project: Project | undefined) {
  const completedStages = useMemo(() => {
    if (!project) return 0;
    return project.stages.filter(s => s.status === 'completed').length;
  }, [project?.stages]);

  const progress = useMemo(() => {
    if (!project) return 0;
    return Math.round((completedStages / project.stages.length) * 100);
  }, [completedStages, project?.stages.length]);

  const hasPendingIssue = useMemo(() => {
    return (project?.issues || []).some(i => !i.isResolved);
  }, [project?.issues]);

  const deadlineStatus = useMemo(() => {
    if (!project) return null;
    return getDeadlineStatus(project.overallDeadline, hasPendingIssue);
  }, [project?.overallDeadline, hasPendingIssue]);

  return {
    completedStages,
    progress,
    hasPendingIssue,
    deadlineStatus,
  };
}