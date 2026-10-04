function AstroBrand() {
  return (
    <div className="astro-brand">
      <img src={import.meta.env.BASE_URL + "logo.png"} alt="Astro" width="264" height="65" />
    </div>
  )
}

export default AstroBrand
