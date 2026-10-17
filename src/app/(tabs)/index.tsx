import { Redirect } from 'expo-router';
import { type ReactElement } from 'react';

export default function TabsIndex(): ReactElement {
  return <Redirect href="/atomizer" />;
}
