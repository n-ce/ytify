import { A } from '@solidjs/router';

export default function NavBar() {
  return (
    <nav>
      <A href="/">Home</A>
      <A href="/Search">Search</A>
      <A href="/settings">Settings</A>
    </nav>
  )
}
