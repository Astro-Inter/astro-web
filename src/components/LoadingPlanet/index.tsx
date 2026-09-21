interface LoadingPlanetProps {
  label?: string
}

/*
 * Geometry from the Figma dev-mode export (node 2235-5161).
 *
 * Ring, given as a border-box:
 *   width 356  height 56.762  border 10px solid #8F00C4  rotate(2.532deg)
 * So outer a=178 b=28.381, inner a=168 b=18.381. The border insets by 10 on
 * both axes, meaning the band is a uniform 10 wide - a stroke, not a tapered
 * annulus - riding the centreline a=173, b=23.381.
 *
 * "Group 22" is the moon. Its relative translates plus width/height resolve to
 * four states per lap (4 x 0.8s in the export), sizes chaining 19 -> 49 -> 73
 * -> 49: it swells at the front of the orbit and shrinks at the back, so the
 * orbit is a perspective projection.
 *
 * Moon sizes and the ring share Figma's unit system, which pins the sphere:
 * measuring the close-up two ways (sphere vs ring width, and front moon vs
 * sphere) both give r = 105.4 / 106.0, hence R=106.
 *
 * The ring and the moon sit in one wobbling group, with the moon's path defined
 * on the un-tilted ellipse, so the moon stays locked to the ring however the
 * ring swings. Interpolating the four Figma states directly would instead cut
 * straight chords across the ellipse and drift off the ring mid-segment.
 *
 * The sphere sits outside the wobble so its shading stays put. "Subtract"
 * tracks the moon at w/h = 31.997/48.995 = 0.6531, which for a lune cut from a
 * circle solves to an offset of d = 0.6123r, applied at 45deg on both bodies.
 */
function LoadingPlanet({ label = 'Carregando' }: LoadingPlanetProps) {
  return (
    <div className="loading-planet" role="status" aria-live="polite">
      <svg
        className="loading-planet-svg"
        viewBox="0 0 430 374"
        aria-hidden="true"
        fill="none"
      >
        <defs>
          <clipPath id="loading-planet-sphere-clip">
            <circle cx="215" cy="187" r="106" />
          </clipPath>
          <clipPath id="loading-planet-moon-clip">
            <circle cx="0" cy="0" r="24.5" />
          </clipPath>

          {/* Moon at its base size (49px); scaled per orbit state */}
          <g id="loading-planet-moon-shape">
            <circle
              cx="0"
              cy="0"
              r="24.5"
              fill="#9E06D7"
              stroke="#8A38F5"
              strokeWidth="1"
            />
            <g clipPath="url(#loading-planet-moon-clip)">
              <path
                fillRule="evenodd"
                fill="#8F00C4"
                fillOpacity="0.5"
                d="M -24.5 0 a 24.5 24.5 0 1 0 49 0 a 24.5 24.5 0 1 0 -49 0 M -13.89 -10.61 a 24.5 24.5 0 1 0 49 0 a 24.5 24.5 0 1 0 -49 0"
              />
            </g>
          </g>
        </defs>

        {/* Behind the sphere: back of the ring, and the moon on its back arc */}
        <g className="loading-planet-wobble">
          <path
            className="loading-planet-ring"
            d="M 20 187 A 195 23.381 0 0 1 410 187"
          />
          <use
            className="loading-planet-moon loading-planet-moon--back"
            href="#loading-planet-moon-shape"
          />
        </g>

        {/* Sphere: #081F8B body with a 50% #8F00C4 lune on the lower-left */}
        <circle cx="215" cy="187" r="106" fill="#081F8B" />
        <g clipPath="url(#loading-planet-sphere-clip)">
          <path
            fillRule="evenodd"
            fill="#8F00C4"
            fillOpacity="0.5"
            d="M 109 187 a 106 106 0 1 0 212 0 a 106 106 0 1 0 -212 0 M 154.894 141.106 a 106 106 0 1 0 212 0 a 106 106 0 1 0 -212 0"
          />
        </g>

        {/* In front of the sphere: front of the ring, and the moon's front arc */}
        <g className="loading-planet-wobble">
          <path
            className="loading-planet-ring"
            d="M 20 187 A 195 23.381 0 0 0 410 187"
          />
          <use
            className="loading-planet-moon loading-planet-moon--front"
            href="#loading-planet-moon-shape"
          />
        </g>
      </svg>

      <p className="loading-planet-label">
        <span>{label}</span>
        <span className="loading-planet-dots" aria-hidden="true" />
      </p>
    </div>
  )
}

export default LoadingPlanet
