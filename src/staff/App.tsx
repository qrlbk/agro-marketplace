import { RouterProvider } from 'react-router';
import { router } from './routes';
import { StaffAuthProvider } from './context/StaffAuthContext';

function StaffApp() {
  return (
    <StaffAuthProvider>
      <RouterProvider router={router} />
    </StaffAuthProvider>
  );
}

export default StaffApp;
