/* Shared, code-native enamel-pin artwork. Badge ownership remains server-controlled. */
(() => {
  const cat='<path d="M35 61V37l14 10q11-5 22 0l14-10v24q0 20-25 20T35 61Z" fill="#fff9ea"/><path d="m40 46 7 5m26 0 7-5" stroke="#eeadbc"/><path d="M47 60v4m26-4v4m-16 5 3 3 3-3m-3 3v3m0 0q-5 4-9 0m9 0q5 4 9 0"/><path d="M32 64h10m-10 7h10m36-7h10m-10 7h10"/><ellipse cx="45" cy="70" rx="5" ry="3" fill="#f6b5b9" stroke="none"/><ellipse cx="75" cy="70" rx="5" ry="3" fill="#f6b5b9" stroke="none"/>';
  const star='<path d="m60 39 6 15 16 1-12 10 4 16-14-9-14 9 4-16-12-10 16-1Z" fill="#ffdb79"/>';
  const book='<path d="M60 48q-13-9-27-3v32q14-6 27 3 13-9 27-3V45q-14-6-27 3Z" fill="#fffaf0"/><path d="M60 49v30M40 54h11m-11 7h11m18-7h10m-10 7h10"/>';
  const symbols={
    committee_member:'<path d="m27 47 33-22 33 22Z" fill="#b9ccee"/><path d="M32 84h56v8H32Z" fill="#b9ccee"/><path d="M38 51v29m22-29v29m22-29v29" stroke-width="7" stroke="#7895bf"/><path d="M27 48h66M28 93h64"/><circle class="badge-council-seal" cx="60" cy="38" r="4" fill="#ffe6a4"/>',
    committee_representative:'<path d="M35 83q-14-12-9-28m59 28q14-12 9-28" stroke="#bd9649"/><path d="m30 74-7-3m7-8-8-5m68 16 7-3m-7-8 8-5" stroke="#bd9649"/><rect x="49" y="29" width="22" height="38" rx="11" fill="#efc96d"/><path d="M43 54v4a17 17 0 0 0 34 0v-4M60 76v15m-12 1h24M56 37h8m-8 7h8"/><path class="badge-voice-wave" d="M81 32q9 9 0 18m6-24q15 15 0 30" stroke="#c49b43"/>',
    partner_member:'<path d="M29 34h25v9a6 6 0 1 0 12 0v-9h25v26h-9a6 6 0 1 0 0 12h9v20H66V81a6 6 0 1 0-12 0v11H29V72h9a6 6 0 1 0 0-12h-9Z" fill="#a9decd"/><path d="M29 60h9a6 6 0 1 1 0 12h-9m62-12h-9a6 6 0 1 0 0 12h9"/><path class="badge-build-link" d="m49 63 8 8 16-18" stroke="#287e69" stroke-width="4"/>',
    partner_representative:'<path d="M33 91V29" stroke-width="3.5"/><g class="badge-host-flag"><path d="M34 31q14-9 29 0t27 0v29q-12 9-27 0t-29 0Z" fill="#f3b29e"/><path d="m59 41 4 4 4-4m-4 4v8" stroke="#a65549"/></g><path d="M27 93h66M45 87q0-12 10-12t10 12m7 0q0-12 10-12t10 12"/><circle cx="55" cy="68" r="5" fill="#ffe4c6"/><circle cx="82" cy="68" r="5" fill="#ffe4c6"/>',
    L0:cat+'<path d="M82 29q8-7 12 0 2 5-5 8v3m0 6v1"/>',
    L1:cat+'<path d="m31 76 29 10 29-10v17l-29 10-29-10Z" fill="#efc595"/><path d="M60 86v17m-29-27-8 9 28 10 9-9 9 9 28-10-8-9" fill="#ffe3b6"/>',
    L2:'<g transform="translate(-8 -5)" opacity=".28">'+cat+'</g><g transform="translate(5 5)">'+cat+'</g>',
    L3:'<ellipse cx="60" cy="61" rx="42" ry="21" transform="rotate(-28 60 61)"/>'+cat+'<g transform="rotate(-28 60 61)"><circle class="badge-orbit-dot" cx="0" cy="0" r="5.5" fill="#a978f3"/><circle class="badge-orbit-echo" cx="0" cy="0" r="3" fill="#50cdb2"/></g>',
    L4:cat+'<path d="m79 85 9-17-1 11h10L84 98l3-13Z" fill="#ffcf63"/><path d="m25 43 3-7m-2 45-4 5"/>',
    L5:'<path d="m35 29 14 6 18-10 21 10"/><circle cx="35" cy="29" r="3" fill="#ffe398"/><circle cx="67" cy="25" r="3" fill="#ffe398"/>'+cat+'<path d="m85 77 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="#ffdc78"/>',
    T:'<path d="M49 34h22m-17 0v23L37 82q-4 10 8 10h30q12 0 8-10L66 57V34" fill="#fff9ec"/><path d="m44 73 32 0 8 13q1 6-9 6H45q-10 0-8-6Z" fill="#a5dfcc"/><path d="m52 78-5 4 5 4m16-8 5 4-5 4"/><circle cx="57" cy="65" r="3" fill="#e8c86c"/>',
    C:book+'<path d="m77 28 3 7 8 2-8 3-3 7-3-7-7-3 7-2Z" fill="#f4c778"/>',
    O:'<path d="M28 84h64M34 82V51m52 31V51M34 57q26 30 52 0M45 68v15m15-11v11m15-15v15"/><circle cx="34" cy="44" r="10" fill="#ffc7b7"/><circle cx="86" cy="44" r="10" fill="#b6dfe2"/><path d="M47 37q13-13 26 0" stroke-dasharray="3 5"/>',
    M:'<circle cx="60" cy="61" r="29" fill="#fffaf0"/><path d="m72 43-7 23-17 13 7-23Z" fill="#a8c4ed"/><path d="m60 24 0 8m0 58v8m-37-37h8m58 0h8"/>',
    A0:cat+'<path d="M85 83q15-9 13-21m-4 0 3-5 5 4"/>',
    A1:'<path d="M44 36v49m34-48v14q0 12-19 12H44"/><circle cx="44" cy="34" r="7" fill="#c5b4ed"/><circle cx="78" cy="34" r="7" fill="#b4dfc7"/><circle cx="44" cy="86" r="7" fill="#b4dfc7"/><path d="m66 80 7 7 14-17"/>',
    A2:'<path d="M30 81h60m-52 0V50h44v31" fill="#d9c9f1"/><circle cx="60" cy="51" r="10" fill="#fff6df"/><path d="M47 78q0-17 13-17t13 17M27 41l6 5m54 0 6-5m-33-17v9"/>',
    A3:'<path d="m32 54 28-23 28 23v34H32Z" fill="#ffe4ae"/><path d="M53 88V69h14v19M43 57h6m22 0h6"/><path d="m60 38 2 5 6 1-5 4 1 5-4-3-4 3 1-5-5-4 6-1Z" fill="#fff"/>',
    A4:book+'<path d="M75 24q17 0 10 17l-4 6H70l-4-6q-7-17 9-17Z" fill="#ffe19c"/><path d="M70 51h11"/>',
    A5:'<path d="m50 64 5 30h10l5-30Z" fill="#d9b4e9"/><path d="M60 26q23 19 12 34-12 15-25 0-10-12 5-23-1 12 6 12 8-4 2-23Z" fill="#ffbd88"/>',
    A6:'<ellipse cx="60" cy="65" rx="19" ry="24" fill="#bae2b4"/><path d="M60 43v45m-15-41-7-9m37 9 7-9M40 59H29m51 0h11M40 73l-12 6m52-6 12 6M51 40q9-10 18 0"/><circle cx="52" cy="57" r="2"/><circle cx="68" cy="57" r="2"/>',
    A7:'<ellipse cx="60" cy="62" rx="35" ry="24" fill="#d5c6f1"/><ellipse cx="60" cy="62" rx="23" ry="15" fill="#faf7ff"/><path d="m30 82 58-42m-4-3 7 1-1 7"/><circle cx="31" cy="81" r="6" fill="#ffc99c"/>',
    A8:'<circle class="badge-core" cx="60" cy="61" r="13" fill="#ffdb91"/><ellipse cx="60" cy="61" rx="42" ry="21" transform="rotate(-25 60 61)"/><ellipse cx="60" cy="61" rx="42" ry="21" transform="rotate(45 60 61)"/><g transform="rotate(-25 60 61)"><circle class="badge-orbit-dot" cx="0" cy="0" r="5" fill="#a978f3"/></g><g transform="rotate(45 60 61)"><circle class="badge-orbit-echo" cx="0" cy="0" r="4" fill="#50cdb2"/></g>',
    A9:cat+'<path d="M31 86h-9m13 7H20m62-7 10-3 7 9H69v-8" fill="#b5cbee"/>',
    A10:'<path d="m60 29 28 11v22q-1 22-28 34-27-12-28-34V40Z" fill="#c6dfed"/><path d="m46 61 10 10 20-23"/>',
    A11:star+'<path d="M29 87q15-14 31-3 16-11 31 3M60 85v12"/><circle cx="28" cy="35" r="3" fill="#e6bcde"/>',
    campus:'<path d="m25 48 35-19 35 19-35 18Z" fill="#c9b7ec"/><path d="M39 58v17q21 16 42 0V58M93 49v28"/><circle cx="93" cy="81" r="4" fill="#ffda81"/><path d="M50 83v10l10-5 10 5V83" fill="#ffe1a1"/>'
  };
  window.spaceqatBadgeArt=(id,earned=false)=>{
    const key=String(id),route=/^[TCOM][0-2]$/.test(key)?key[0]:key;
    const organizationColors={committee_member:['#e6edfc','#7895bf'],committee_representative:['#fff1d9','#c49b43'],partner_member:['#e2f5ed','#55a58b'],partner_representative:['#ffe8df','#cd8c79']};
    const colors=organizationColors[route]||(route.startsWith('L')?['#e2f5ed','#78b8a4']:route==='T'?['#e4f2e2','#8fba8b']:route==='C'?['#fff1d9','#d7b574']:route==='O'?['#ffe8df','#d9a093']:route==='M'?['#e6edfc','#99afd6']:['#efe8fb','#b4a0d4']);
    const tier=/^[TCOM][0-2]$/.test(key)?Number(key[1])+1:0;
    const dots=Array.from({length:tier},(_,i)=>`<circle cx="${60+(i-(tier-1)/2)*10}" cy="104" r="2.5" fill="${['#bb865c','#8399b2','#cb9a35'][tier-1]}" stroke="none"/>`).join('');
    const safeRoute=Object.hasOwn(symbols,route)?route:'other';
    return `<svg class="badge-illustration badge-route-${safeRoute} ${earned?'is-earned':'is-unearned'}" viewBox="0 0 120 128" aria-hidden="true" focusable="false"><path class="badge-ribbon" d="m38 93-6 28 28-12 28 12-6-28" fill="${colors[1]}" stroke="#fff" stroke-width="3"/><rect class="badge-enamel" x="9" y="7" width="102" height="102" rx="35" fill="${colors[0]}" stroke="${colors[1]}" stroke-width="2"/><rect class="badge-rim" x="15" y="13" width="90" height="90" rx="29" fill="none" stroke="#fff" stroke-width="2"/><g class="badge-symbol" fill="none" stroke="#3d5862" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${symbols[route]||star}</g>${dots}<path class="badge-sparkle" d="m99 13 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#fff"/></svg>`;
  };
})();
