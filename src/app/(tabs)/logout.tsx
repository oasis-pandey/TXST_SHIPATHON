import { Redirect } from 'expo-router';

export default function LogoutScreen() {
  // Logout is a tab-bar action. If stale navigation state restores this route,
  // return to Discover without invalidating a newly-created session.
  return <Redirect href="/" />;
}
