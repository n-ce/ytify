import { JSXElement } from "solid-js"

const IconLink = (
  { href, label, children }: {
    href: string,
    label: string,
    children: JSXElement | JSXElement[]
  }) =>
  <a href={'https://' + href} target='blank'>
    <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" stroke-width={2} stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <title>{label}</title>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      {children}
    </svg>
  </a>

export default function Community() {
  return (
    <div id="community">

      <IconLink href='t.me/ytifytg' label='Telegram'>
        <path d="M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4" />
      </IconLink>

      <IconLink href='matrix.to/#/#ytify:matrix.org' label='Matrix'>
        <path d="M4 3h-1v18h1" />
        <path d="M20 21h1v-18h-1" />
        <path d="M7 9v6" />
        <path d="M12 15v-3.5a2.5 2.5 0 1 0 -5 0v.5" />
        <path d="M17 15v-3.5a2.5 2.5 0 1 0 -5 0v.5" />
      </IconLink>

      <IconLink href='github.com/n-ce/ytify' label='Github'>
        <path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5" />
      </IconLink>

    </div>
  )
}
