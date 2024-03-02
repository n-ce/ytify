
export default function LibraryItem({ label }: { label: string }) {
  return (
    <div id="libraryItem" onclick={() => alert('i was clicked')}>
      <svg xmlns="http://www.w3.org/2000/svg" width={'3rem'} height={'3rem'} viewBox="0 0 176 176">
        <circle cx="88" cy="88" r="88" fill="none" />
        <path fill="var(--text)" d="M88 46a42 42 0 1 1 0 84 42 42 0 0 1 0-84m0-4a46 46 0 1 0 0 92 46 46 0 0 0 0-92z" />
        <path fill="var(--text)" d="m72 111 39-24-39-22z" />
      </svg>
      <p>{label}</p>
    </div>
  )
}
