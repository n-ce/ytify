import { setConfig } from "@lib/utils";

export default function() {

  return <div
    style={{
      'height': '100%',
      'display': 'flex',
      "flex-direction": 'column',
      "justify-content": 'center',
      "align-items": 'center',
      'gap': 'var(--size-5)'
    }}
  >
    <i
      style={{
        "font-size": 'var(--font-size-8)'
      }}
      class='ri-cloud-off-fill'></i>
    <p
      style={{ 'text-align': 'center' }}
    >You are offline, To ensure your library integrity, please come back when you are online.</p>
    <button
      onclick={() => { setConfig('dbsync', '') }}
      style={{
        'background-color': 'var(--onBg)',
        'border-radius': 'var(--roundness)',
        'cursor': 'pointer'
      }}
    >Turn off Cloud Sync</button>
  </div>;
}
