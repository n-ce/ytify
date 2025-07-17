import './list.css';

export default function(_: {
  close: () => void
}) {
  return (
    <h1 onclick={_.close}>List</h1>
  )
}
