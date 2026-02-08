const content = document.getElementById("content");

function openTopic(topic) {
  const topics = {
    basics: `
      <h2>Concrete Basics</h2>
      <ul>
        <li>Concrete is strong in compression</li>
        <li>Steel carries tensile forces</li>
        <li>Perfect bond is assumed</li>
      </ul>
    `,
    materials: `
      <h2>Materials</h2>
      <ul>
        <li>Concrete strength: f'c</li>
        <li>Steel yield strength: fy</li>
        <li>Stress–strain behavior matters</li>
      </ul>
    `,
    design: `
      <h2>Design Philosophy</h2>
      <ul>
        <li>Limit State Design</li>
        <li>Strength reduction factor (ϕ)</li>
        <li>Ductile failure preferred</li>
      </ul>
    `,
    flexure: `
      <h2>Flexure</h2>
      <ul>
        <li>Neutral axis controls stress</li>
        <li>Under-reinforced sections are safe</li>
        <li>Moment capacity depends on steel</li>
      </ul>
    `,
    shear: `
      <h2>Shear</h2>
      <ul>
        <li>Shear failure is brittle</li>
        <li>Stirrups are critical</li>
        <li>Concrete alone is unsafe</li>
      </ul>
    `
  };

  content.innerHTML = topics[topic];
}

