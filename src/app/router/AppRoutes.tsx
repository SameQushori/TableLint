import { Navigate, Route, Routes } from 'react-router-dom';

import { RouteGuard } from '@app/router/RouteGuard';
import { UploadPreparedScreen } from '@features/upload/ui/UploadPreparedScreen';
import { UploadScreen } from '@features/upload/ui/UploadScreen';
import { ValidationSummaryScreen } from '@features/validation/ui/ValidationSummaryScreen';
import { ReportScreen } from '@features/export/ui/ReportScreen';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<UploadScreen />} />
      <Route
        path="/setup"
        element={
          <RouteGuard requires="session">
            <UploadPreparedScreen />
          </RouteGuard>
        }
      />
      <Route
        path="/workspace"
        element={
          <RouteGuard requires="dataset">
            <ValidationSummaryScreen />
          </RouteGuard>
        }
      />
      <Route
        path="/report"
        element={
          <RouteGuard requires="report">
            <ReportScreen />
          </RouteGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
