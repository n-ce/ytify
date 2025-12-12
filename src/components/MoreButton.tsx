export default function(_: {
  handleClick: () => void
}) {

  return (

    <i
      class="ri-more-2-fill"
      onclick={_.handleClick}
    ></i>
  )

}
