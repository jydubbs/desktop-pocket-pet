// Draws the pet as SVG from its species, stage, mood, outfit and colour.
// Everything lives in a 160 x 150 box with the ground at y = 141.
// Each species has its own body, and tells the face and outfits where its eyes, mouth and head are ("anchors").
(function () {
  const INK = '#3a2a55';
  const CHEEK = '#f58db1';
  const PINK = '#f8b7cc';
  const SCALE = { baby: 0.66, teen: 0.84, adult: 1 };
  const GROW = { baby: 0, teen: 1, adult: 2 };

  // Colours you can pick: [light, middle, shade]
  const COLORS = {
    pink: ['#fbe4f0', '#e9b8dc', '#c99ad0'],
    peach: ['#fff0e4', '#fbc6a2', '#e59a78'],
    mint: ['#e9fbf2', '#ade5c7', '#6fbd98'],
    sky: ['#e8f4ff', '#acd2f6', '#76a5da'],
    lavender: ['#f2ecff', '#cbb7f3', '#9a84d6'],
    lemon: ['#fffbe2', '#f6e38c', '#d6b84c'],
    cloud: ['#ffffff', '#e8e6f0', '#b8b4c9'],
    cocoa: ['#f3dcc4', '#c8956a', '#8f5e3c'],
    shiny: ['#fff8d6', '#f4c94a', '#c08a1e'], // shinies: everything gold
  };
  // "Natural" gives each species its real-life colouring.
  const NATURAL = {
    blob: COLORS.pink,
    bunny: ['#ffffff', '#eeecf3', '#c3bfd0'],
    cat: ['#fdf3e6', '#efdcc2', '#9c7b63'],
    frog: ['#e6f7d6', '#8ccf6a', '#4f9a3a'],
    capybara: ['#f3dcc4', '#c08a5e', '#8a5a3a'],
    dragon: ['#ffd9c2', '#f0705a', '#b83d3a'],
    redpanda: ['#ffd2b0', '#e2683a', '#a8401f'],
    quokka: ['#ecd2b2', '#b98d62', '#7d5a3c'],
    otter: ['#f1e0c8', '#b8875c', '#7b5638'],
    panda: ['#ffffff', '#f2f1f5', '#c9c6d3'],
    raccoon: ['#ebe0d2', '#a8927c', '#6e5848'],
    ferret: ['#f8ecd8', '#c9a582', '#8a6a52'],
    bear: ['#ecc9a0', '#b9814c', '#7e5530'],
    lamb: ['#ffffff', '#f4f0e9', '#d6cdc0'],
    phoenix: ['#ffe7b0', '#f79a3c', '#d4471f'],
    pegasus: ['#ffffff', '#f4f0fa', '#cbc3dc'],
  };
  // Colour maths, for deriving matching shades.
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (a) => `#${a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
  const mix = (a, b, t) => {
    const A = hex(a);
    const B = hex(b);
    return toHex(A.map((v, i) => v + (B[i] - v) * t));
  };

  // Extra shades some animals need (patches, masks, flames, manes...).
  // With a chosen colour they're all derived from it, so a mint phoenix has mint flames (pandas are the exception, below).
  function derivedTones([l, m, s]) {
    const deep = mix(s, '#3a1f3a', 0.32); // a deeper shade of the same colour, not grey
    return {
      deep,
      flameA: mix(l, m, 0.55), flameB: s, flameC: m, flameTip: deep, feet: s, beak: s, beakEdge: deep, faceGlow: l,
      mane: s, streak: mix(m, '#ffffff', 0.35), hoof: deep, wing: l, wingTip: m,
      ring: deep, under: deep, white: mix(l, '#ffffff', 0.7), tear: s,
      mask: s, face: mix(l, m, 0.35), earIn: m, nose: s, paws: s,
    };
  }
  // In Natural colouring, the real-life shades.
  const NATURAL_TONES = {
    phoenix: { flameA: '#ffcf4a', flameB: '#f2552e', flameC: '#f79a3c', flameTip: '#e2452a', feet: '#f2a03a', beak: '#ffc23d', beakEdge: '#c98316', faceGlow: '#fff4d6' },
    pegasus: { mane: '#8fd3e8', streak: '#c4a8f2', hoof: '#b7a3d8', wing: '#ffffff', wingTip: '#e7e0f6' },
    redpanda: { deep: '#4a2724', ring: '#7a3420', under: '#5a2c26', white: '#ffffff', tear: '#8a3a20' },
    panda: { deep: '#2d2a33', nose: '#8a5a4a' },
    raccoon: { deep: '#4a3a30', ring: '#4a3a30' },
    ferret: { deep: '#5a4336', mask: '#8a6a55' },
    lamb: { deep: '#5a4a46', face: '#fbe3d6', earIn: '#f6b3c0' },
    otter: { paws: '#7b5638' },
  };
  // Pandas keep their white fur in every colour; only the black patches take the chosen colour.
  const KEEP_WHITE = { panda: true };
  const palette = (c, species = 'blob') => {
    const natural = c === 'natural';
    if (!natural && c !== 'shiny' && KEEP_WHITE[species] && COLORS[c]) {
      const chosen = COLORS[c];
      const p = [...NATURAL[species]];
      const patch = mix(chosen[2], '#3a1f3a', 0.14); // the chosen colour, a touch deeper so white eye lines still show
      p.x = { ...derivedTones(p), ...(NATURAL_TONES[species] || {}), deep: patch, nose: mix(chosen[2], '#3a1f3a', 0.45) };
      p.deep = patch;
      return p;
    }
    const p = [...(natural ? NATURAL[species] || COLORS.pink : COLORS[c] || COLORS.pink)];
    p.x = { ...derivedTones(p), ...(natural ? NATURAL_TONES[species] || {} : {}) };
    p.deep = p.x.deep;
    return p;
  };
  let uid = 0;

  const defs = (color, species) => {
    const [a, b, c] = palette(color, species);
    return `
    <defs>
      <radialGradient id="skin" cx="40%" cy="35%" r="70%">
        <stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/>
      </radialGradient>
      <radialGradient id="shell" cx="38%" cy="30%" r="75%">
        <stop offset="0" stop-color="#fffaf2"/><stop offset=".7" stop-color="#f7e3d2"/><stop offset="1" stop-color="#e8c6b3"/>
      </radialGradient>
    </defs>`;
  };
  const SKIN = 'url(#skin)';
  const mirror = (svg) => `${svg}<g transform="translate(160 0) scale(-1 1)">${svg}</g>`;
  const outline = (c, w = 1.6) => `stroke="${c[2]}" stroke-width="${w}" stroke-linejoin="round"`;

  // ---------------------------------------------------------------------------
  // Faces, placed by the species' anchors
  // A.ex: eye distance from centre, A.ey: eye line, A.eyeScale, A.mouthY, A.cheekY, A.cheekX
  // ---------------------------------------------------------------------------
  const EYES = {
    open(A, x, y, k, baby) {
      return `<ellipse class="eye" cx="${x}" cy="${y}" rx="${6.5 * k}" ry="${8.5 * k}" fill="${INK}"/>
        <circle cx="${x + 2.5 * k}" cy="${y - 3 * k}" r="${2.3 * k}" fill="#fff"/>
        ${baby ? `<circle cx="${x - 2.6 * k}" cy="${y + 3.6 * k}" r="${1.2 * k}" fill="#fff"/>` : ''}`;
    },
    happy: (A, x, y, k) => `<path d="M${x - 7 * k} ${y + 3 * k} Q${x} ${y - 8 * k} ${x + 7 * k} ${y + 3 * k}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    closed: (A, x, y, k) => `<path d="M${x - 7 * k} ${y} Q${x} ${y + 6 * k} ${x + 7 * k} ${y}" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    droopy: (A, x, y, k, baby, side) => `<ellipse class="eye" cx="${x}" cy="${y + 4}" rx="${5.5 * k}" ry="${6.5 * k}" fill="${INK}"/>
        <circle cx="${x + 2 * k}" cy="${y + 2}" r="${1.8 * k}" fill="#fff"/>
        <path d="M${x - 8 * k * side} ${y - 4} L${x + 6 * k * side} ${y - 9}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    surprised: (A, x, y, k) => `<circle cx="${x}" cy="${y - 1}" r="${8.5 * k}" fill="${INK}"/><circle cx="${x + 3 * k}" cy="${y - 4 * k}" r="${3 * k}" fill="#fff"/>`,
  };
  // Eyes for dark eye patches: white whites and white lines so they still show.
  const MASK_EYES = {
    open: (A, x, y, k) => `<circle cx="${x}" cy="${y}" r="${7.5 * k}" fill="#fff"/>
        <circle class="eye" cx="${x + 0.5}" cy="${y + 0.5}" r="${5.2 * k}" fill="${INK}"/><circle cx="${x + 2 * k}" cy="${y - 2 * k}" r="${1.8 * k}" fill="#fff"/>`,
    happy: (A, x, y, k) => `<path d="M${x - 7 * k} ${y + 3 * k} Q${x} ${y - 8 * k} ${x + 7 * k} ${y + 3 * k}" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    closed: (A, x, y, k) => `<path d="M${x - 7 * k} ${y} Q${x} ${y + 6 * k} ${x + 7 * k} ${y}" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    droopy: (A, x, y, k, baby, side) => `<circle cx="${x}" cy="${y + 2}" r="${7 * k}" fill="#fff"/><circle class="eye" cx="${x}" cy="${y + 4}" r="${4.6 * k}" fill="${INK}"/>
        <path d="M${x - 8 * k * side} ${y - 7} L${x + 6 * k * side} ${y - 12}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    surprised: (A, x, y, k) => `<circle cx="${x}" cy="${y}" r="${9 * k}" fill="#fff"/><circle cx="${x}" cy="${y}" r="${4 * k}" fill="${INK}"/>`,
  };
  const MOUTHS = {
    smile: (my) => `<path d="M74 ${my} Q80 ${my + 6} 86 ${my}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    grin: (my) => `<path d="M71 ${my - 2} Q80 ${my + 11} 89 ${my - 2} Z" fill="${INK}"/><path d="M75 ${my + 3} Q80 ${my + 8} 85 ${my + 3} Z" fill="#f48fb1"/>`,
    small: (my) => `<path d="M76 ${my + 2} Q80 ${my + 4} 84 ${my + 2}" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    frown: (my) => `<path d="M73 ${my + 6} Q80 ${my} 87 ${my + 6}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    chomp: (my) => `<ellipse class="chomp" cx="80" cy="${my + 3}" rx="8" ry="7" fill="${INK}"/>`,
    o: (my) => `<ellipse cx="80" cy="${my + 4}" rx="5" ry="6" fill="${INK}"/>`,
  };
  const MOODS = {
    content: ['open', 'smile', 0.55],
    happy: ['happy', 'grin', 0.75],
    sleepy: ['closed', 'small', 0.4],
    droopy: ['droopy', 'frown', 0.3],
    eat: ['happy', 'chomp', 0.8],
    surprised: ['surprised', 'o', 0.6],
    giggle: ['happy', 'grin', 0.9],
  };

  function face(A, mood, stage, sp, c) {
    const [eyeKind, mouthKind, blush] = MOODS[mood] || MOODS.content;
    const baby = stage === 'baby';
    const k = (A.eyeScale || 1) * (baby ? 1.2 : 1);
    const my = A.mouthY ?? A.ey + 15;
    const cy = A.cheekY ?? A.ey + 16;
    const cx = A.cheekX ?? A.ex + 14;
    const set = sp.maskEyes ? MASK_EYES : EYES;
    const eyes = sp.eyes
      ? sp.eyes(eyeKind, A, stage, c)
      : set[eyeKind](A, 80 - A.ex, A.ey, k, baby, 1) + set[eyeKind](A, 80 + A.ex, A.ey, k, baby, -1);
    const zz = mood === 'sleepy'
      ? `<g class="zz" fill="${INK}" font-family="ui-rounded, sans-serif" font-weight="800">
           <text x="${80 + A.ex + 18}" y="${A.top + 16}" font-size="14">z</text><text x="${80 + A.ex + 30}" y="${A.top + 2}" font-size="10">z</text></g>`
      : '';
    return `${eyes}
      <ellipse cx="${80 - cx}" cy="${cy}" rx="9" ry="5.5" fill="${CHEEK}" opacity="${blush}"/>
      <ellipse cx="${80 + cx}" cy="${cy}" rx="9" ry="5.5" fill="${CHEEK}" opacity="${blush}"/>
      ${(sp.nose ? sp.nose(A, c) : '')}${sp.mouth ? sp.mouth(mouthKind, my, c) : MOUTHS[mouthKind](my)}${zz}`;
  }

  // ---------------------------------------------------------------------------
  // Species
  // Each returns: anchors, clip (silhouette for clothes), top (hidden under a cap),
  // back (behind the body), body, front (over the body, under the face).
  // ---------------------------------------------------------------------------

  // Blob: the original. Each stage has its own silhouette, hair and limbs.
  const BLOB_SHAPES = {
    baby: {
      body: 'M80 30 C122 30 140 70 138 104 C136 132 112 141 80 141 C48 141 24 132 22 104 C20 70 38 30 80 30 Z',
      hair: (c) => `<path d="M80 32 C72 22 82 13 88 20 C91 25 85 29 82 25" stroke="${c}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
      limbs: () => '',
    },
    teen: {
      body: 'M80 20 C117 20 133 66 132 104 C131 132 109 141 80 141 C51 141 29 132 28 104 C27 66 43 20 80 20 Z',
      hair: (c) => `<path d="M80 22 C77 10 89 5 88 15" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/>
                    <path d="M80 22 C80 12 71 9 70 16" stroke="${c}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
      limbs: (c) => `<ellipse cx="62" cy="139" rx="11" ry="5.5" fill="${c}"/><ellipse cx="98" cy="139" rx="11" ry="5.5" fill="${c}"/>`,
    },
    adult: {
      body: 'M80 30 C122 30 140 70 138 104 C136 132 112 141 80 141 C48 141 24 132 22 104 C20 70 38 30 80 30 Z',
      hair: (c) => `<path d="M80 31 C76 16 90 10 89 22" stroke="${c}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
                    <path d="M80 31 C82 21 72 17 71 25" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/>
                    <path d="M80 31 C80 18 80 12 80 10" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/>
                    <circle cx="80" cy="9" r="3.5" fill="${c}"/>`,
      limbs: (c, mid) => `
        <ellipse cx="58" cy="139" rx="14" ry="6.5" fill="${c}"/><ellipse cx="102" cy="139" rx="14" ry="6.5" fill="${c}"/>
        <ellipse cx="21" cy="112" rx="8" ry="13" fill="${mid}" stroke="${c}" stroke-width="1.5" transform="rotate(25 21 112)"/>
        <g class="wave"><ellipse cx="139" cy="98" rx="8" ry="13" fill="${mid}" stroke="${c}" stroke-width="1.5" transform="rotate(-35 139 98)"/></g>`,
    },
  };

  const SPECIES = {
    blob: {
      anchors: (stage) => {
        const teen = stage === 'teen';
        return { ex: 18, ey: 88, top: teen ? 20 : 30, fh: teen ? 58 : 62, hw: teen ? 50 : 56, maskY: teen ? 50 : 56,
          mouthY: 103, cheekY: 104, cheekX: 32, belly: 119, badge: [117, 124], glassR: 13 };
      },
      clip: (stage) => `<path d="${BLOB_SHAPES[stage].body}"/>`,
      top: (stage, c) => BLOB_SHAPES[stage].hair(c[2]),
      back: () => '',
      body: (stage) => `<path d="${BLOB_SHAPES[stage].body}" fill="${SKIN}"/>
        <ellipse cx="62" cy="52" rx="14" ry="8" fill="#fff" opacity=".55" transform="rotate(-25 62 52)"/>`,
      front: (stage, c) => BLOB_SHAPES[stage].limbs(c[2], c[1]),
    },

    // Cat: sits upright, big round head, pointy ears, fluffy chest, darker "points" like a colourpoint cat.
    cat: {
      anchors: () => ({ ex: 17, ey: 58, top: 26, fh: 40, hw: 40, maskY: 38, mouthY: 76, cheekY: 72, cheekX: 31,
        belly: 114, badge: [114, 126], eyeScale: 1.15, glassR: 13 }),
      clip: (stage) => `<ellipse cx="80" cy="62" rx="44" ry="36"/><path d="${catBody(stage)}"/>`,
      top: () => '',
      back: (stage, c) => {
        const g = GROW[stage];
        const tip = [26, 18, 12][g];
        const tail = [
          'M112 134 C126 138 134 128 130 118',
          'M112 134 C140 140 148 118 140 102',
          'M112 134 C150 142 156 108 142 90',
        ][g];
        return `<path d="${tail}" stroke="${c[2]}" stroke-width="${[10, 13, 16][g]}" fill="none" stroke-linecap="round"/>` +
          mirror(`<path d="M38 58 L44 ${tip} L70 32 Z" fill="${c[2]}" ${outline(c)}/>
                  <path d="M45 50 L48 ${tip + 12} L62 36 Z" fill="${PINK}"/>`);
      },
      body: (stage, c) => `
        <path d="${catBody(stage)}" fill="${SKIN}"/>
        <path d="M58 94 Q62 102 66 96 Q70 104 74 97 Q80 106 86 97 Q90 104 94 96 Q98 102 102 94 Q100 124 80 126 Q60 124 58 94 Z" fill="${c[0]}"/>
        <ellipse cx="80" cy="62" rx="44" ry="36" fill="${SKIN}"/>
        <path d="M37 64 L28 70 L38 76 M123 64 L132 70 L122 76" fill="${c[1]}" stroke="${c[1]}" stroke-width="2" stroke-linejoin="round"/>
        <ellipse cx="62" cy="40" rx="12" ry="6" fill="#fff" opacity=".5" transform="rotate(-20 62 40)"/>`,
      front: (stage, c) => `
        <ellipse cx="80" cy="74" rx="16" ry="11" fill="${c[2]}" opacity=".45"/>
        <ellipse cx="66" cy="138" rx="10" ry="6" fill="${c[0]}" ${outline(c, 1.2)}/>
        <ellipse cx="94" cy="138" rx="10" ry="6" fill="${c[0]}" ${outline(c, 1.2)}/>
        <path d="M63 136 v4 M68 136 v4 M91 136 v4 M96 136 v4" stroke="${c[2]}" stroke-width="1" opacity=".6"/>`,
      nose: () => `<path d="M76 70 L84 70 L80 74 Z" fill="#f48fb1"/>` +
        mirror(`<path d="M60 74 L42 70 M60 78 L41 80" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" opacity=".5"/>`),
    },

    // Frog: chubby and wide, huge eyes on top, arm nubs, toe feet, pale belly.
    frog: {
      anchors: (stage) => ({ ex: 22, ey: 50, top: 30, fh: 74, hw: 50, maskY: 30, mouthY: 70, cheekY: 72, cheekX: 38,
        belly: 120, badge: [118, 126], glassR: [14, 16, 17][GROW[stage]] }),
      clip: () => `<path d="${FROG_BODY}"/>`,
      top: () => '',
      back: () => '',
      body: (stage, c) => {
        const r = [16, 18, 20][GROW[stage]];
        return `
        <path d="${FROG_BODY}" fill="${SKIN}" ${outline(c)}/>
        <ellipse cx="80" cy="116" rx="34" ry="20" fill="${c[0]}" opacity=".85"/>
        ${mirror(`<circle cx="58" cy="50" r="${r}" fill="${SKIN}" ${outline(c)}/>`)}
        <ellipse cx="52" cy="38" rx="6" ry="3.5" fill="#fff" opacity=".5"/>`;
      },
      front: (stage, c) => mirror(`
        <ellipse cx="27" cy="104" rx="7" ry="11" fill="${c[1]}" ${outline(c, 1.4)} transform="rotate(25 27 104)"/>
        <ellipse cx="52" cy="139" rx="6" ry="4" fill="${c[1]}" ${outline(c, 1.2)}/>
        <ellipse cx="60" cy="140" rx="6" ry="4" fill="${c[1]}" ${outline(c, 1.2)}/>
        <ellipse cx="68" cy="139" rx="6" ry="4" fill="${c[1]}" ${outline(c, 1.2)}/>`),
      eyes: (kind, A, stage) => {
        const r = [16, 18, 20][GROW[stage]];
        const eye = (x, side) => {
          const y = 50;
          if (kind === 'happy') return `<path d="M${x - 8} ${y + 3} Q${x} ${y - 8} ${x + 8} ${y + 3}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
          if (kind === 'closed') return `<path d="M${x - 8} ${y} Q${x} ${y + 6} ${x + 8} ${y}" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
          const pupil = kind === 'surprised' ? r * 0.38 : r * 0.55;
          const py = kind === 'droopy' ? y + 4 : y + 1;
          const lid = kind === 'droopy'
            ? `<path d="M${x - r * 0.75} ${y - 1} A${r * 0.75} ${r * 0.75} 0 0 1 ${x + r * 0.75} ${y - 1} Z" fill="${SKIN}"/>
               <path d="M${x - r * 0.75} ${y - 1} L${x + r * 0.75} ${y + side * 0}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`
            : '';
          return `<circle cx="${x}" cy="${y}" r="${r * 0.75}" fill="#fff"/>
            <circle class="eye" cx="${x + 1}" cy="${py}" r="${pupil}" fill="${INK}"/>
            <circle cx="${x - r * 0.15}" cy="${py - r * 0.25}" r="${r * 0.17}" fill="#fff"/>${lid}`;
        };
        return eye(58, 1) + eye(102, -1);
      },
    },

    // Bunny: big round head, huge eyes, one upright ear and one floppy ear, big feet, puffy tail.
    bunny: {
      anchors: () => ({ ex: 18, ey: 70, top: 30, fh: 46, hw: 42, maskY: 44, mouthY: 84, cheekY: 82, cheekX: 32,
        belly: 112, badge: [110, 128], eyeScale: 1.25, glassR: 14 }),
      clip: (stage) => `<ellipse cx="80" cy="70" rx="44" ry="40"/><ellipse cx="80" cy="122" rx="${[26, 30, 34][GROW[stage]]}" ry="20"/>`,
      top: () => '',
      back: (stage, c) => {
        const g = GROW[stage];
        const ear = (cx, cy, ry, rot) => `<g transform="rotate(${rot} ${cx} ${cy})">
            <ellipse cx="${cx}" cy="${cy}" rx="11" ry="${ry}" fill="${c[1]}" ${outline(c)}/>
            <ellipse cx="${cx}" cy="${cy + 2}" rx="5" ry="${ry - 6}" fill="${PINK}"/></g>`;
        const left = ear(58, [26, 20, 14][g], [18, 26, 32][g], -12);
        const right = g === 0 ? ear(102, 26, 18, 12) : ear(g === 1 ? 118 : 122, g === 1 ? 46 : 52, g === 1 ? 24 : 30, g === 1 ? 60 : 64);
        return `${left}${right}<circle cx="116" cy="128" r="${[7, 9, 11][g]}" fill="#fff" ${outline(c, 1.2)}/>`;
      },
      body: (stage, c) => `
        <ellipse cx="80" cy="122" rx="${[26, 30, 34][GROW[stage]]}" ry="20" fill="${SKIN}"/>
        <ellipse cx="80" cy="70" rx="44" ry="40" fill="${SKIN}"/>
        <ellipse cx="62" cy="46" rx="12" ry="7" fill="#fff" opacity=".55" transform="rotate(-25 62 46)"/>`,
      front: (stage, c) => `
        <ellipse cx="60" cy="138" rx="14" ry="6" fill="${c[0]}" ${outline(c, 1.2)}/>
        <ellipse cx="100" cy="138" rx="14" ry="6" fill="${c[0]}" ${outline(c, 1.2)}/>`,
      nose: () => `<ellipse cx="80" cy="80" rx="3.6" ry="2.6" fill="#f48fb1"/>`,
    },

    // Dragon: chibi, big head with horns and forehead spots, bat wings, striped belly, spiky tail.
    dragon: {
      anchors: () => ({ ex: 18, ey: 66, top: 28, fh: 42, hw: 42, maskY: 40, mouthY: 88, cheekY: 84, cheekX: 32,
        belly: 108, badge: [110, 128], eyeScale: 1.2, glassR: 14 }),
      clip: (stage) => `<ellipse cx="80" cy="66" rx="44" ry="38"/><ellipse cx="80" cy="118" rx="${[28, 30, 34][GROW[stage]]}" ry="24"/>`,
      top: () => '',
      back: (stage, c) => {
        const g = GROW[stage];
        const tail = [
          `<path d="M104 132 Q124 138 130 126" stroke="${c[1]}" stroke-width="8" fill="none" stroke-linecap="round"/>`,
          `<path d="M106 132 C132 140 144 128 146 114" stroke="${c[1]}" stroke-width="10" fill="none" stroke-linecap="round"/>
           <path d="M146 104 L139 116 L152 116 Z" fill="${c[2]}"/>`,
          `<path d="M106 132 C136 142 152 130 154 112" stroke="${c[1]}" stroke-width="12" fill="none" stroke-linecap="round"/>
           <path d="M126 134 l4 -8 l4 7 Z M140 130 l5 -7 l3 8 Z" fill="${c[2]}"/>
           <path d="M154 100 L146 114 L162 114 Z" fill="${c[2]}"/>`,
        ][g];
        const k = [0, 0.6, 1][g];
        const pt = (x, y) => `${(46 - (46 - x) * k).toFixed(1)} ${(96 - (96 - y) * k).toFixed(1)}`;
        const wing = g === 0 ? '' : mirror(`
          <path d="M${pt(46, 86)} L${pt(4, 52)} Q${pt(10, 72)} ${pt(18, 70)} Q${pt(20, 86)} ${pt(30, 84)} Q${pt(34, 98)} ${pt(46, 104)} Z"
            fill="${c[0]}" stroke="${c[2]}" stroke-width="2.5" stroke-linejoin="round"/>
          <path d="M${pt(46, 88)} L${pt(18, 70)} M${pt(46, 94)} L${pt(30, 84)}" stroke="${c[2]}" stroke-width="2" stroke-linecap="round"/>`);
        const hl = [-8, 0, 6][g];
        const horns = mirror(`<path d="M52 44 C46 34 46 ${26 - hl} 50 ${14 - hl} C56 24 62 32 66 38 Z" fill="${c[0]}" ${outline(c)}/>`);
        return tail + wing + horns;
      },
      body: (stage, c) => {
        const bw = [28, 30, 34][GROW[stage]];
        return `
        <ellipse cx="80" cy="118" rx="${bw}" ry="24" fill="${SKIN}"/>
        <ellipse cx="80" cy="122" rx="${bw * 0.58}" ry="17" fill="${c[0]}"/>
        <path d="M68 116 h24 M66 123 h28 M69 130 h22" stroke="${c[2]}" stroke-width="1.4" opacity=".45"/>
        <ellipse cx="80" cy="66" rx="44" ry="38" fill="${SKIN}"/>
        <ellipse cx="80" cy="34" rx="4" ry="5" fill="${c[2]}"/><ellipse cx="80" cy="45" rx="3" ry="3.5" fill="${c[2]}"/>
        <ellipse cx="60" cy="42" rx="12" ry="6.5" fill="#fff" opacity=".5" transform="rotate(-25 60 42)"/>`;
      },
      front: (stage, c) => `
        ${mirror(`<ellipse cx="${[56, 54, 50][GROW[stage]]}" cy="112" rx="7" ry="10" fill="${c[1]}" ${outline(c, 1.3)} transform="rotate(20 54 112)"/>`)}
        <ellipse cx="66" cy="139" rx="11" ry="6" fill="${c[1]}" ${outline(c, 1.3)}/>
        <ellipse cx="94" cy="139" rx="11" ry="6" fill="${c[1]}" ${outline(c, 1.3)}/>
        <path d="M60 139 v2 M66 140 v2 M72 139 v2 M88 139 v2 M94 140 v2 M100 139 v2" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
      nose: (A, c) => `<ellipse cx="75" cy="81" rx="1.8" ry="1.3" fill="${c[2]}"/><ellipse cx="85" cy="81" rx="1.8" ry="1.3" fill="${c[2]}"/>`,
    },

    // Capybara: a chunky loaf, tiny ears, small eyes, big dark snout, stubby feet. Adults wear an orange.
    capybara: {
      anchors: () => ({ ex: 24, ey: 60, top: 38, fh: 50, hw: 52, maskY: 46, mouthY: 92, cheekY: 74, cheekX: 42,
        belly: 120, badge: [118, 124], eyeScale: 0.8, glassR: 12 }),
      clip: () => `<path d="${CAPY_BODY}"/>`,
      top: (stage) => (stage === 'adult'
        ? `<circle cx="80" cy="28" r="10" fill="#f6a03c"/><circle cx="77" cy="25" r="3" fill="#fbc77d"/><path d="M80 19 q5 -6 10 -3 q-5 4 -10 3" fill="#7cc58f"/>`
        : ''),
      back: (stage, c) => mirror(`<ellipse cx="46" cy="46" rx="8" ry="7" fill="${c[2]}"/><ellipse cx="46" cy="47" rx="4" ry="3.5" fill="${c[1]}"/>`),
      body: () => `<path d="${CAPY_BODY}" fill="${SKIN}"/>
        <ellipse cx="58" cy="52" rx="14" ry="6" fill="#fff" opacity=".45" transform="rotate(-12 58 52)"/>`,
      front: (stage, c) => `
        <ellipse cx="80" cy="84" rx="28" ry="19" fill="${c[2]}" opacity=".42"/>
        <ellipse cx="56" cy="139" rx="12" ry="5" fill="${c[2]}"/><ellipse cx="104" cy="139" rx="12" ry="5" fill="${c[2]}"/>`,
      nose: () => `<ellipse cx="72" cy="78" rx="3" ry="2" fill="${INK}" opacity=".8"/><ellipse cx="88" cy="78" rx="3" ry="2" fill="${INK}" opacity=".8"/>`,
    },
  };

  // A sitting animal: round head on a chubby body. Each species adds ears, tail, markings and paws.
  const DARK = '#3b2b2a';
  function sitter(o) {
    const head = { rx: 42, ry: 36, cy: 62, ...(o.head || {}) };
    const bw = (stage) => (o.bodyW || [28, 32, 36])[GROW[stage]];
    const bodyCy = o.bodyCy || 118;
    const bodyRy = o.bodyRy || 24;
    return {
      maskEyes: o.maskEyes,
      anchors: () => ({ ex: 18, ey: 62, top: head.cy - head.ry, fh: head.cy - 22, hw: head.rx - 2, maskY: head.cy - 24,
        mouthY: 82, cheekY: 78, cheekX: 31, belly: bodyCy - 8, badge: [80 + bw('adult') - 6, 128], eyeScale: 1.1, glassR: 13, ...(o.anchors || {}) }),
      clip: (stage) => `<ellipse cx="80" cy="${head.cy}" rx="${head.rx}" ry="${head.ry}"/><ellipse cx="80" cy="${bodyCy}" rx="${bw(stage)}" ry="${bodyRy}"/>`,
      top: (stage, c) => (o.top ? o.top(stage, c) : ''),
      back: (stage, c) => (o.tail ? o.tail(stage, c) : '') + (o.ears ? o.ears(stage, c) : ''),
      body: (stage, c) => `
        <ellipse cx="80" cy="${bodyCy}" rx="${bw(stage)}" ry="${bodyRy}" fill="${SKIN}"/>
        ${o.belly === false ? '' : `<ellipse cx="80" cy="${bodyCy + 4}" rx="${bw(stage) * 0.58}" ry="${bodyRy * 0.7}" fill="${o.bellyColor ? o.bellyColor(c) : c[0]}"/>`}
        ${o.underHead ? o.underHead(stage, c) : ''}
        <ellipse cx="80" cy="${head.cy}" rx="${head.rx}" ry="${head.ry}" fill="${SKIN}"/>
        <ellipse cx="${80 - head.rx * 0.45}" cy="${head.cy - head.ry * 0.6}" rx="11" ry="6" fill="#fff" opacity=".45" transform="rotate(-22 ${80 - head.rx * 0.45} ${head.cy - head.ry * 0.6})"/>
        ${o.markings ? o.markings(stage, c) : ''}`,
      front: (stage, c) => {
        const limb = o.limbColor ? o.limbColor(c) : c[1];
        const w = bw(stage);
        return `
        ${mirror(`<ellipse cx="${80 - w + 8}" cy="${bodyCy - 6}" rx="7" ry="10" fill="${limb}" ${outline(c, 1.2)} transform="rotate(18 ${80 - w + 8} ${bodyCy - 6})"/>`)}
        ${mirror(`<ellipse cx="${80 - w * 0.45}" cy="139" rx="11" ry="6" fill="${limb}" ${outline(c, 1.2)}/>`)}
        ${o.extra ? o.extra(stage, c) : ''}`;
      },
      nose: o.nose,
      mouth: o.mouth,
    };
  }

  // Feathered wings fanning out from the shoulders; bigger at each stage.
  function featherWing(stage, fill, edge, tip) {
    const k = [0.55, 0.8, 1][GROW[stage]];
    const feathers = [[36, 58], [46, 34], [40, 12]];
    const sx = 48;
    const sy = 96;
    return mirror(feathers.map(([len, ang]) => {
      const L = len * k;
      return `<g transform="rotate(${ang} ${sx} ${sy})">
        <ellipse cx="${sx - L / 2}" cy="${sy}" rx="${L / 2 + 4}" ry="${8 * (0.7 + k * 0.3)}" fill="${fill}" stroke="${edge}" stroke-width="1.6"/>
        <ellipse cx="${sx - L + 4}" cy="${sy}" rx="${Math.max(4, L / 5)}" ry="${5.5 * (0.7 + k * 0.3)}" fill="${tip}"/></g>`;
    }).join(''));
  }

  // A beak instead of a mouth: closed for calm moods, open for eating, grinning and gasps.
  const beak = (size = 1, hooked = false) => (kind, my, c) => {
    const w = 8 * size;
    const gold = c.x.beak;
    const edge = c.x.beakEdge;
    const y = my - 4;
    const tip = hooked ? `Q${80 + 2} ${y + 13 * size} ${80 - 1} ${y + 14 * size}` : `L80 ${y + 11 * size}`;
    if (['grin', 'chomp', 'o'].includes(kind)) {
      return `<path d="M${80 - w} ${y + 4} L80 ${y + 13 * size} L${80 + w} ${y + 4} Z" fill="#f47aa0"/>
        <path d="M${80 - w} ${y + 4} Q80 ${y + 9} ${80 + w} ${y + 4} L80 ${y + 14 * size} Z" fill="${gold}" stroke="${edge}" stroke-width="1.4" stroke-linejoin="round" transform="translate(0 ${3 * size})"/>
        <path d="M${80 - w} ${y + 1} Q80 ${y - 4 * size} ${80 + w} ${y + 1} L80 ${y + 8 * size} Z" fill="${gold}" stroke="${edge}" stroke-width="1.4" stroke-linejoin="round"/>`;
    }
    return `<path d="M${80 - w} ${y} Q80 ${y - 5 * size} ${80 + w} ${y} ${tip} Z" fill="${gold}" stroke="${edge}" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M${80 - w * 0.5} ${y + 1} Q80 ${y - 1} ${80 + w * 0.5} ${y + 1}" stroke="#fff" stroke-width="1.4" fill="none" opacity=".6"/>`;
  };
  const roundEars = (inner, color) => (stage, c) => {
    const r = [10, 11, 13][GROW[stage]];
    return mirror(`<circle cx="46" cy="32" r="${r}" fill="${color ? color(c) : c[1]}" ${outline(c)}/><circle cx="46" cy="33" r="${r * 0.55}" fill="${inner(c)}"/>`);
  };
  const pointyEars = (fill, inner) => (stage, c) => {
    const tip = [18, 12, 8][GROW[stage]];
    return mirror(`<path d="M40 50 L46 ${tip} L70 30 Z" fill="${fill(c)}" ${outline(c)}/><path d="M46 44 L49 ${tip + 11} L62 33 Z" fill="${inner(c)}"/>`);
  };
  // A fluffy tail with stripes, for red pandas and raccoons.
  const ringedTail = (ring) => (stage, c) => {
    const g = GROW[stage];
    const d = ['M106 132 C122 138 132 130 132 120', 'M106 132 C134 142 148 124 144 104', 'M106 132 C142 146 160 120 150 94'][g];
    const w = [12, 16, 20][g];
    return `<path d="${d}" stroke="${c[1]}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
      <path d="${d}" stroke="${ring(c)}" stroke-width="${w}" fill="none" stroke-dasharray="7 8" stroke-dashoffset="4"/>`;
  };
  const whiskers = mirror(`<path d="M62 80 L44 76 M62 84 L43 86" stroke="${INK}" stroke-width="1.3" stroke-linecap="round" opacity=".45"/>`);
  const roundNose = (color = INK) => () => `<ellipse cx="80" cy="76" rx="5.5" ry="4" fill="${color}"/><ellipse cx="78" cy="74.6" rx="1.6" ry="1" fill="#fff" opacity=".6"/>`;

  Object.assign(SPECIES, {
    // Phoenix: a round fire bird with a flame crest, fiery wings and a sweeping flame tail.
    phoenix: sitter({
      head: { rx: 38, ry: 34, cy: 62 },
      bodyW: [26, 30, 34],
      top: (stage, c) => {
        const k = [0.6, 0.85, 1][GROW[stage]];
        const plume = (x, rot, h, fill) => `<path d="M${x} 34 C${x - 8} ${34 - h * 0.5} ${x - 2} ${34 - h * 0.9} ${x} ${34 - h} C${x + 2} ${34 - h * 0.9} ${x + 8} ${34 - h * 0.5} ${x} 34 Z" fill="${fill}" transform="rotate(${rot} ${x} 34)"/>`;
        return plume(70, -24, 24 * k, c.x.flameA) + plume(90, 24, 24 * k, c.x.flameA) + plume(80, 0, 32 * k, c.x.flameB);
      },
      ears: (stage, c) => featherWing(stage, c[1], c[2], c.x.flameTip),
      tail: (stage, c) => {
        const k = [0.5, 0.8, 1][GROW[stage]];
        const f = (d, fill, w) => `<path d="${d}" stroke="${fill}" stroke-width="${w * k}" fill="none" stroke-linecap="round"/>`;
        return f(`M100 132 C${118 + 20 * k} 140 ${130 + 22 * k} ${128 - 10 * k} ${134 + 18 * k} ${110 - 22 * k}`, c.x.flameB, 12)
          + f(`M100 134 C${120 + 18 * k} 146 ${140 + 18 * k} ${138 - 6 * k} ${146 + 14 * k} ${124 - 16 * k}`, c.x.flameA, 9)
          + f(`M98 136 C${114 + 10 * k} 148 ${128 + 12 * k} 146 ${136 + 10 * k} ${140 - 4 * k}`, c.x.flameC, 8);
      },
      limbColor: (c) => c.x.feet,
      markings: (stage, c) => `<ellipse cx="80" cy="74" rx="20" ry="14" fill="${c.x.faceGlow}" opacity=".7"/>`,
      mouth: beak(1),
      anchors: { mouthY: 80, cheekY: 74, cheekX: 29 },
    }),

    // Pegasus: a white pony with a pastel mane, soft muzzle, feathered wings and little hooves.
    pegasus: sitter({
      head: { rx: 38, ry: 34, cy: 60 },
      ears: (stage, c) => featherWing(stage, c.x.wing, c[2], c.x.wingTip)
        + mirror(`<path d="M48 44 L50 ${[22, 16, 12][GROW[stage]]} L64 34 Z" fill="${c[1]}" ${outline(c)}/><path d="M51 39 L52 ${[28, 23, 20][GROW[stage]]} L60 35 Z" fill="${PINK}"/>`)
        + `<path d="M108 36 C130 46 132 76 120 98 C134 78 132 50 116 36 Z" fill="${c.x.mane}"/>
           <path d="M112 40 C126 54 124 78 116 92" stroke="${c.x.streak}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      tail: (stage, c) => `<path d="M104 132 C126 140 140 128 140 ${[124, 112, 100][GROW[stage]]}" stroke="${c.x.mane}" stroke-width="${[10, 13, 16][GROW[stage]]}" fill="none" stroke-linecap="round"/>
        <path d="M108 134 C126 140 134 130 136 ${[124, 116, 106][GROW[stage]]}" stroke="${c.x.streak}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      limbColor: (c) => c[1],
      markings: (stage, c) => `
        <ellipse cx="80" cy="80" rx="20" ry="13" fill="${c[0]}" stroke="${c[2]}" stroke-width="1"/>
        <path d="M60 30 C66 20 84 18 92 28 C86 26 80 30 82 40 C76 32 68 30 60 30 Z" fill="${c.x.mane}"/>
        <path d="M70 26 C74 22 82 22 86 26" stroke="${c.x.streak}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      nose: () => `<ellipse cx="74" cy="80" rx="2" ry="1.4" fill="${INK}" opacity=".6"/><ellipse cx="86" cy="80" rx="2" ry="1.4" fill="${INK}" opacity=".6"/>`,
      extra: (stage, c) => mirror(`<ellipse cx="${80 - 16}" cy="141" rx="8" ry="3" fill="${c.x.hoof}"/>`),
      anchors: { ey: 56, mouthY: 85, cheekY: 72, cheekX: 30 },
    }),

    redpanda: sitter({
      ears: pointyEars((c) => c[1], (c) => c.x.white),
      tail: ringedTail((c) => c.x.ring),
      limbColor: (c) => c.deep,
      belly: false,
      underHead: (stage, c) => `<ellipse cx="80" cy="112" rx="18" ry="12" fill="${c.x.under}" opacity=".85"/>`,
      markings: (stage, c) => `
        <ellipse cx="80" cy="78" rx="16" ry="11" fill="${c.x.white}"/>
        ${mirror(`<ellipse cx="58" cy="46" rx="6" ry="4" fill="${c.x.white}" transform="rotate(-15 58 46)"/>
          <ellipse cx="46" cy="72" rx="9" ry="12" fill="${c.x.white}" opacity=".95"/>
          <path d="M62 68 Q60 80 54 88" stroke="${c.x.tear}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>`)}`,
      nose: roundNose(DARK),
    }),
    quokka: sitter({
      head: { rx: 38, ry: 34, cy: 60 },
      bodyW: [30, 34, 38],
      bodyRy: 28,
      bodyCy: 114,
      ears: roundEars(() => '#f3b9b0'),
      tail: (stage, c) => `<path d="M104 134 Q120 140 126 132" stroke="${c[1]}" stroke-width="9" fill="none" stroke-linecap="round"/>`,
      limbColor: (c) => c[2],
      markings: (stage, c) => `<ellipse cx="80" cy="78" rx="15" ry="11" fill="${c[0]}"/>`,
      nose: () => `<ellipse cx="80" cy="73" rx="7" ry="5" fill="${DARK}"/><ellipse cx="77.5" cy="71.5" rx="2" ry="1.2" fill="#fff" opacity=".6"/>`,
      anchors: { ey: 58, mouthY: 79, cheekY: 74, cheekX: 29, ex: 16 },
    }),
    otter: sitter({
      head: { rx: 40, ry: 34, cy: 62 },
      bodyW: [26, 30, 32],
      bodyRy: 28,
      ears: (stage, c) => mirror(`<circle cx="42" cy="50" r="${[6, 7, 8][GROW[stage]]}" fill="${c[2]}"/>`),
      tail: (stage, c) => `<path d="M100 136 C120 142 134 136 140 124" stroke="${c[2]}" stroke-width="${[9, 11, 13][GROW[stage]]}" fill="none" stroke-linecap="round"/>`,
      limbColor: (c) => c[2],
      markings: (stage, c) => `<ellipse cx="80" cy="70" rx="30" ry="24" fill="${c[0]}" opacity=".9"/>`,
      nose: () => `<path d="M74 74 Q80 71 86 74 Q84 80 80 80 Q76 80 74 74 Z" fill="${DARK}"/>${whiskers}`,
      extra: (stage, c) => (stage === 'baby' ? '' : `
        <g transform="translate(80 106)"><path d="M-10 6 Q-11 -8 0 -10 Q11 -8 10 6 Z" fill="#fff4ec" stroke="#e4b7a4" stroke-width="1.4"/>
          <path d="M-6 4 L-3 -7 M0 5 L0 -9 M6 4 L3 -7" stroke="#e4b7a4" stroke-width="1.2"/></g>
        ${mirror(`<ellipse cx="68" cy="106" rx="7" ry="6" fill="${c.x.paws}"/>`)}`),
      anchors: { mouthY: 82, cheekY: 78 },
    }),
    panda: sitter({
      maskEyes: true,
      ears: roundEars((c) => c.deep, (c) => c.deep),
      limbColor: (c) => c.deep,
      belly: false,
      underHead: (stage, c) => `<path d="M48 104 Q80 92 112 104 L112 112 Q80 102 48 112 Z" fill="${c.deep}"/>`,
      markings: (stage, c) => mirror(`<ellipse cx="59" cy="64" rx="16" ry="21" fill="${c.deep}" transform="rotate(32 59 64)"/>`),
      nose: (A, c) => `<ellipse cx="80" cy="76" rx="5" ry="3.6" fill="${c.x.nose}"/>`,
    }),
    raccoon: sitter({
      maskEyes: true,
      ears: pointyEars((c) => c[1], (c) => c.deep),
      tail: ringedTail((c) => c.x.ring),
      limbColor: (c) => c.deep,
      markings: (stage, c) => `
        <path d="M38 64 Q48 50 62 56 Q80 64 98 56 Q112 50 122 64 Q112 76 98 70 Q80 64 62 70 Q48 76 38 64 Z" fill="${c.deep}"/>
        <ellipse cx="80" cy="80" rx="15" ry="10" fill="${c[0]}"/>
        ${mirror(`<path d="M58 46 Q62 42 68 46" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`)}`,
      nose: roundNose(DARK),
    }),
    ferret: sitter({
      head: { rx: 38, ry: 34, cy: 60 },
      bodyW: [24, 28, 32],
      bodyRy: 30,
      bodyCy: 112,
      ears: roundEars(() => '#f3b0b0', (c) => c[2]),
      tail: (stage, c) => `<path d="M104 134 C130 142 150 132 154 116" stroke="${c.deep}" stroke-width="${[9, 12, 14][GROW[stage]]}" fill="none" stroke-linecap="round"/>`,
      limbColor: (c) => c.deep,
      bellyColor: (c) => c[0],
      markings: (stage, c) => `
        <ellipse cx="80" cy="68" rx="30" ry="24" fill="${c[0]}"/>
        ${mirror(`<ellipse cx="62" cy="58" rx="11" ry="9" fill="${c.x.mask}" opacity=".75"/>`)}`,
      nose: () => `<path d="M76 72 L84 72 L80 76 Z" fill="#f08a9a"/>${whiskers}`,
      anchors: { ey: 58, mouthY: 78, cheekY: 72, cheekX: 30, ex: 18 },
    }),
    bear: sitter({
      bodyW: [30, 34, 38],
      ears: roundEars((c) => c[0]),
      markings: (stage, c) => `<ellipse cx="80" cy="78" rx="17" ry="12" fill="${c[0]}"/>`,
      nose: roundNose(DARK),
    }),
    lamb: sitter({
      head: { rx: 34, ry: 32, cy: 64 },
      ears: (stage, c) => mirror(`<ellipse cx="34" cy="66" rx="14" ry="7" fill="${c.x.face}" stroke="${c[2]}" stroke-width="1.4" transform="rotate(-25 34 66)"/>
        <ellipse cx="35" cy="66" rx="8" ry="3.5" fill="${c.x.earIn}" transform="rotate(-25 35 66)"/>`),
      limbColor: (c) => c.deep,
      belly: false,
      // a fluffy wool cloud around the head and body, then the face on top
      underHead: (stage, c) => {
        const puffs = [[56, 100, 14], [80, 96, 15], [104, 100, 14], [50, 118, 14], [110, 118, 14], [64, 130, 13], [96, 130, 13], [80, 118, 18]];
        return puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c[0]}" stroke="${c[2]}" stroke-width="1.4"/>`).join('');
      },
      top: (stage, c) => {
        const puffs = [[56, 40, 13], [70, 32, 14], [86, 30, 14], [102, 36, 13], [112, 50, 11], [46, 52, 11]];
        return puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r * [0.8, 0.9, 1][GROW[stage]]}" fill="${c[0]}" stroke="${c[2]}" stroke-width="1.4"/>`).join('');
      },
      markings: (stage, c) => `<ellipse cx="80" cy="70" rx="28" ry="26" fill="${c.x.face}"/>`,
      nose: () => `<ellipse cx="80" cy="78" rx="4" ry="2.8" fill="#f2a3b3"/>`,
      anchors: { ey: 66, mouthY: 82, cheekY: 80, cheekX: 26, ex: 15, eyeScale: 0.9 },
    }),
  });

  function catBody(stage) {
    const bw = [34, 38, 44][GROW[stage]];
    return `M80 70 C${80 + bw * 0.8} 70 ${80 + bw} 96 ${80 + bw} 118 C${80 + bw} 134 ${80 + bw * 0.7} 141 80 141 C${80 - bw * 0.7} 141 ${80 - bw} 134 ${80 - bw} 118 C${80 - bw} 96 ${80 - bw * 0.8} 70 80 70 Z`;
  }
  const FROG_BODY = 'M80 44 C116 44 134 70 136 100 C138 128 120 141 80 141 C40 141 22 128 24 100 C26 70 44 44 80 44 Z';
  const CAPY_BODY = 'M46 42 C70 34 104 34 120 46 C136 58 138 100 136 118 C134 136 118 141 80 141 C42 141 26 136 24 118 C22 96 22 54 46 42 Z';

  // ---------------------------------------------------------------------------
  // Outfits, placed by anchors so they fit every species
  // ---------------------------------------------------------------------------
  const star = (x, y, r) =>
    `<path class="twinkle" d="M${x} ${y - r} Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y} Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r} Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y} Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r} Z" fill="#ffd76e"/>`;

  const OUTFITS = {
    study: {
      hidesTop: true,
      front: (A) => {
        const r = A.glassR || 13;
        const L = 80 - A.ex;
        const R = 80 + A.ex;
        const dy = A.top - 30; // the cap was designed for a head top at y = 30
        return `
        <g fill="none" stroke="${INK}" stroke-width="3">
          <circle cx="${L}" cy="${A.ey}" r="${r}" fill="#fff" fill-opacity=".18"/><circle cx="${R}" cy="${A.ey}" r="${r}" fill="#fff" fill-opacity=".18"/>
          <path d="M${L + r} ${A.ey - 1} Q80 ${A.ey - 5} ${R - r} ${A.ey - 1}"/>
          <path d="M${L - r} ${A.ey - 3} L${L - r - 13} ${A.ey - 8}"/><path d="M${R + r} ${A.ey - 3} L${R + r + 13} ${A.ey - 8}"/>
        </g>
        <g transform="translate(0 ${dy})">
          <path d="M62 31 v8 q18 9 36 0 v-8 z" fill="#3b3f6b"/>
          <path d="M80 14 L114 26 L80 38 L46 26 Z" fill="#4a4f80"/>
          <path d="M80 26 L106 32 L106 44" stroke="#f4c542" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <circle cx="106" cy="46" r="3.5" fill="#f4c542"/>
        </g>`;
      },
    },
    fitness: {
      front: (A) => `
        <g clip-path="url(#bodyClip)">
          <rect x="0" y="${A.belly}" width="160" height="40" fill="#5b8def"/>
          <rect x="0" y="${A.belly}" width="160" height="4" fill="#fff" opacity=".9"/>
          <text x="80" y="${A.belly + 19}" text-anchor="middle" font-family="ui-rounded, sans-serif" font-weight="900" font-size="13" fill="#fff">1</text>
          <path d="M${80 - A.hw - 24} ${A.fh + 4} Q80 ${A.fh - 16} ${80 + A.hw + 24} ${A.fh + 4}" stroke="#f0655a" stroke-width="11" fill="none"/>
          <path d="M${80 - A.hw - 24} ${A.fh + 4} Q80 ${A.fh - 16} ${80 + A.hw + 24} ${A.fh + 4}" stroke="#fff" stroke-width="2.5" fill="none" opacity=".85"/>
        </g>
        <path d="M${80 + A.hw - 2} ${A.fh - 2} l13 9 M${80 + A.hw - 2} ${A.fh - 2} l15 -3" stroke="#f0655a" stroke-width="5" stroke-linecap="round"/>`,
    },
    mind: {
      front: (A) => `
        <ellipse class="halo" cx="80" cy="${A.top - 25}" rx="25" ry="6" fill="none" stroke="#8fd6ad" stroke-width="4"/>
        <g transform="translate(${80 - A.hw * 0.68 - 42} ${A.top - 30})">
          <path d="M42 52 q-16 -10 -8 -26 q14 6 8 26 z" fill="#7cc58f"/>
          <path d="M42 52 q-6 -10 -6 -22" stroke="#4f9b67" stroke-width="1.5" fill="none"/>
        </g>`,
    },
    health: {
      front: (A) => `
        <path d="M${80 - A.hw - 12} ${A.maskY + 6} Q80 ${A.maskY - 12} ${80 + A.hw + 12} ${A.maskY + 6}" stroke="#c9a6e8" stroke-width="3" fill="none" clip-path="url(#bodyClip)"/>
        <rect x="55" y="${A.maskY - 9.5}" width="50" height="19" rx="9.5" fill="#c9a6e8"/>
        <path d="M63 ${A.maskY} q5 4 10 0 M87 ${A.maskY} q5 4 10 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        ${star(80 - A.hw - 8, A.fh + 8, 7)}${star(80 + A.hw + 8, A.fh + 28, 6)}${star(80 - A.hw, 122, 5)}${star(80 + A.hw - 4, A.top, 4)}`,
    },
  };

  // Accent: a small badge on its side for your second-favourite category.
  const BADGE_ICON = {
    study: '<rect x="-6" y="-5" width="5.5" height="10" rx="1" fill="#6f9fe6"/><rect x=".5" y="-5" width="5.5" height="10" rx="1" fill="#8fb5ee"/>',
    fitness: '<rect x="-6.5" y="-1" width="13" height="2" fill="#6b6f80"/><rect x="-7.5" y="-4.5" width="3.5" height="9" rx="1" fill="#f09a4e"/><rect x="4" y="-4.5" width="3.5" height="9" rx="1" fill="#f09a4e"/>',
    mind: '<path d="M-5 5 Q-6 -5 5 -6 Q6 4 -5 5 Z" fill="#66bb8c"/>',
    health: '<path d="M0 -6 C-3 -1 -5 1 -5 3 a5 5 0 0 0 10 0 c0 -2 -2 -4 -5 -9 z" fill="#7fbcf2"/>',
  };
  const badge = (cat, A) => cat && BADGE_ICON[cat]
    ? `<g transform="translate(${A.badge[0]} ${A.badge[1]})"><circle r="11" fill="#fff" stroke="#e2cdef" stroke-width="2"/>${BADGE_ICON[cat]}</g>`
    : '';

  // ---------------------------------------------------------------------------

  function creature(stage, mood, look = {}, color, species = 'blob', shiny = false) {
    const sp = SPECIES[species] || SPECIES.blob;
    const c = palette(color, species);
    const A = sp.anchors(stage);
    const s = SCALE[stage] || 1;
    const outfit = OUTFITS[look.main];
    return `
      <ellipse class="shadow" cx="80" cy="142" rx="${48 * s}" ry="${7 * s}" fill="${INK}"/>
      <g transform="translate(80 141) scale(${s}) translate(-80 -141)">
        <g class="body">
          <clipPath id="bodyClip">${sp.clip(stage)}</clipPath>
          ${outfit && outfit.hidesTop ? '' : sp.top(stage, c)}
          ${sp.back(stage, c)}
          ${sp.body(stage, c)}
          ${sp.front(stage, c)}
          <g class="face">${face(A, mood, stage, sp, c)}</g>
          ${shiny ? shinyShimmer() : ''}
          ${outfit ? outfit.front(A) : ''}
          ${badge(look.accent, A)}
        </g>
      </g>
      ${shiny ? shinyStars() : ''}`;
  }

  // Shiny extras: gold stars twinkling around it, and a band of light sweeping across every few seconds.
  // Animated inside the SVG itself, so it works the same on the desktop, in the hangouts and everywhere else.
  function shinyShimmer() {
    return `
      <defs><linearGradient id="shimmer" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient></defs>
      <g clip-path="url(#bodyClip)">
        <rect x="-50" y="-10" width="34" height="170" fill="url(#shimmer)" transform="skewX(-18)">
          <animateTransform attributeName="transform" type="translate" additive="sum" values="0 0; 260 0; 260 0" keyTimes="0; .3; 1" dur="4.5s" repeatCount="indefinite"/>
        </rect>
      </g>`;
  }
  function shinyStars() {
    const star = (x, y, r, dur, delay) => `<path d="M${x} ${y - r} L${x + r * 0.22} ${y - r * 0.22} L${x + r} ${y} L${x + r * 0.22} ${y + r * 0.22} L${x} ${y + r} L${x - r * 0.22} ${y + r * 0.22} L${x - r} ${y} L${x - r * 0.22} ${y - r * 0.22} Z"
        fill="#ffd54a" stroke="#fff6c8" stroke-width=".8">
        <animate attributeName="opacity" values=".15;1;.15" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/></path>`;
    return star(20, 52, 8, 1.8, 0) + star(140, 38, 6.5, 2.2, -0.7) + star(146, 104, 5, 1.6, -1.1) + star(14, 112, 5.5, 2.4, -0.4) + star(118, 10, 4.5, 2, -1.5);
  }

  function egg(progress, color, species) {
    const tint = palette(color, species)[1];
    const cracks = progress >= 0.85
      ? `<path d="M48 80 L58 88 L66 79 L76 90 L86 80 L95 90 L104 81 L112 88" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linejoin="round" opacity=".7"/>
         <path d="M70 120 L76 112 L82 118" stroke="${INK}" stroke-width="2" fill="none" opacity=".5"/>`
      : progress >= 0.5
        ? `<path d="M70 70 L77 78 L72 86 L80 92" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linejoin="round" opacity=".6"/>`
        : '';
    return `
      <ellipse class="shadow" cx="80" cy="142" rx="34" ry="6" fill="${INK}"/>
      <g class="body egg">
        <path d="M80 40 C108 40 122 82 120 108 C118 132 102 141 80 141 C58 141 42 132 40 108 C38 82 52 40 80 40 Z" fill="url(#shell)"/>
        <circle cx="64" cy="76" r="7" fill="${tint}" opacity=".85"/>
        <circle cx="98" cy="96" r="9" fill="${tint}" opacity=".6"/>
        <circle cx="70" cy="118" r="5" fill="${tint}" opacity=".85"/>
        <circle cx="100" cy="64" r="4" fill="${tint}" opacity=".6"/>
        <ellipse cx="66" cy="58" rx="9" ry="5" fill="#fff" opacity=".7" transform="rotate(-30 66 58)"/>
        ${cracks}
      </g>`;
  }

  // Where the mouth sits (in pet-window pixels) so treats land in it.
  function mouthPoint(stage, species = 'blob') {
    if (stage === 'egg') return { x: 90, y: 120 };
    const sp = SPECIES[species] || SPECIES.blob;
    const A = sp.anchors(stage);
    const my = (A.mouthY ?? A.ey + 15) + 3;
    const s = SCALE[stage] || 1;
    return { x: 90, y: 34 + 141 - (141 - my) * s };
  }

  // Treats match the habit's category.
  const TREATS = {
    study: `<svg viewBox="0 0 32 32"><path d="M16 9c-3-3-11-2-11 7 0 7 5 12 8 12 1.5 0 2-.7 3-.7s1.5.7 3 .7c3 0 8-5 8-12 0-9-8-10-11-7z" fill="#ef6b6b"/><path d="M16 9c0-3 1-5 3-6" stroke="#7a5230" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M17 7c3-3 7-2 7-2s-1 4-5 4" fill="#7cc576"/></svg>`,
    fitness: `<svg viewBox="0 0 32 32"><path d="M6 8c2 12 10 18 20 15-8-1-14-7-16-15z" fill="#f7cf4d" stroke="#d9a92b" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 8 5 5" stroke="#7a5230" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    mind: `<svg viewBox="0 0 32 32"><path d="M6 13h17v6c0 5-4 8-8.5 8S6 24 6 19z" fill="#a8dcbf"/><path d="M23 15h2a3 3 0 0 1 0 6h-2" stroke="#a8dcbf" stroke-width="2.5" fill="none"/><path d="M12 10c0-2 2-2 2-4M16 10c0-2 2-2 2-4" stroke="#b9b0c9" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`,
    health: `<svg viewBox="0 0 32 32"><path d="M16 4C12 10 8 14 8 19a8 8 0 0 0 16 0c0-5-4-9-8-15z" fill="#7fbcf2"/><ellipse cx="12.5" cy="18" rx="2" ry="3.5" fill="#fff" opacity=".7"/></svg>`,
  };

  // ---------------------------------------------------------------------------
  // Pixel style: the same drawing, snapped to a 4-unit grid (40 x 37 "pixels"), with fewer colours and a
  // dark pixel outline. It's a filter on the live drawing, so bounces, blinks and sparkles keep animating.
  // ---------------------------------------------------------------------------
  const PX = 4;
  const SAMPLE = 2; // the sampled dot in each block (Chromium drops the filter below ~60px wide, so previews stay at least that big)
  const STEPS = '0 .16 .32 .48 .64 .8 .9 1';
  const pixelFilter = () => `
    <filter id="px" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="-8" y="-8" width="176" height="166" color-interpolation-filters="sRGB">
      <feMorphology in="SourceGraphic" operator="erode" radius="0.7" result="bold"/>
      <feGaussianBlur in="bold" stdDeviation="1" result="avg"/>
      <feComponentTransfer in="avg" result="hard"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer>
      <feFlood x="${PX / 2}" y="${PX / 2}" width="${SAMPLE}" height="${SAMPLE}" flood-color="#fff"/>
      <feComposite width="${PX}" height="${PX}"/>
      <feTile result="grid"/>
      <feComposite in="hard" in2="grid" operator="in"/>
      <feMorphology operator="dilate" radius="${(PX - SAMPLE) / 2}" result="mosaic"/>
      <feComponentTransfer in="mosaic" result="flat">
        <feFuncR type="discrete" tableValues="${STEPS}"/><feFuncG type="discrete" tableValues="${STEPS}"/><feFuncB type="discrete" tableValues="${STEPS}"/>
      </feComponentTransfer>
      <feMorphology in="mosaic" operator="dilate" radius="${PX}" result="fat"/>
      <feFlood flood-color="#2a1f3d"/>
      <feComposite in2="fat" operator="in" result="edge"/>
      <feMerge><feMergeNode in="edge"/><feMergeNode in="flat"/></feMerge>
    </filter>`;

  const STYLES = ['pixel', 'soft'];
  let style = (window.pet && STYLES.includes(window.pet.artStyle)) ? window.pet.artStyle : 'pixel';

  window.PetArt = {
    svg(stage, mood, progress, look, color, species, shiny = false) {
      const glow = Boolean(shiny) && stage !== 'egg';
      if (glow) color = 'shiny'; // shinies are always gold
      let inner = stage === 'egg' ? egg(progress, color, species) : creature(stage, mood, look, color, species, glow);
      let extra = '';
      if (style === 'pixel') {
        extra = `<defs>${pixelFilter()}</defs>`;
        inner = `<g filter="url(#px)">${inner}</g>`;
      }
      // Unique ids per drawing, so several pets with different colours can share one page.
      uid += 1;
      return `<svg viewBox="0 0 160 150" aria-hidden="true" class="art-${style}">${defs(color, species)}${extra}${inner}</svg>`
        .replace(/id="(skin|shell|bodyClip|shimmer|px)"/g, `id="$1-${uid}"`)
        .replace(/url\(#(skin|shell|bodyClip|shimmer|px)\)/g, `url(#$1-${uid})`);
    },
    get style() { return style; },
    setStyle(s) { if (STYLES.includes(s)) style = s; },
    STYLES,
    mouthPoint,
    treat: (cat) => TREATS[cat] || TREATS.health,
    COLORS,
    SPECIES: Object.keys(SPECIES),
  };
})();
