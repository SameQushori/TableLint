import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAppSelector } from '@app/store/hooks';

type GuardRequirement = 'session' | 'dataset' | 'report';

interface RouteGuardProps {
  children: ReactNode;
  requires: GuardRequirement;
}

export function RouteGuard({ children, requires }: RouteGuardProps) {
  const workflow = useAppSelector((state) => state.workflow);
  const canEnter =
    requires === 'session'
      ? workflow.sessionId !== null
      : requires === 'dataset'
        ? workflow.datasetReady
        : workflow.reportReady;

  if (!canEnter) {
    return <Navigate to="/" replace state={{ blockedRoute: requires }} />;
  }

  return children;
}
