// src/data/names.js

const FIRST = [
  'Torin','Kael','Sera','Dwyn','Mira','Voss','Thane','Lyra','Brenn',
  'Cael','Nara','Edric','Fynn','Sable','Renn','Oswin','Tilda','Gareth','Wren',
  'Hadwyn','Isra','Jorik','Kylen','Lorne','Marek','Niven','Orin','Petra','Quinn',
  'Rowan','Soren','Teva','Ulric','Vera','Wynn','Xara','Yorn','Zael','Brek',
  'Corra','Daven','Elwyn','Faric','Gale','Holt','Irene','Jareth','Kira','Lund',
]

const LAST = [
  'Ashvale','Ironfeld','Coldmere','Dunvast','Embermoor','Farwick','Greyhollow',
  'Harken','Ironwood','Jastrow','Keldric','Mossgate','Norfeld','Ovast',
  'Penwick','Quarren','Ravenmere','Stonehollow','Thorn','Verdane',
  'Westholt','Ashford','Blackmere','Crownfeld','Dusthaven','Edgewick','Frostmere',
  'Galwick','Halvast','Jadehollow','Keldwick','Lanvast','Morfeld','Dunmere',
]

// entries: array of objects with an `iid` field
export function generateNames(entries) {
  const used = new Set()
  const names = {}
  const total = FIRST.length * LAST.length
  entries.forEach(e => {
    let seed
    do { seed = Math.floor(Math.random() * total) } while (used.has(seed))
    used.add(seed)
    names[e.iid] = FIRST[seed % FIRST.length] + ' ' + LAST[Math.floor(seed / FIRST.length) % LAST.length]
  })
  return names
}

export function generateSingleName(existingNames) {
  const used = new Set(Object.values(existingNames))
  const total = FIRST.length * LAST.length
  let seed, name, attempts = 0
  do {
    seed = Math.floor(Math.random() * total)
    name = FIRST[seed % FIRST.length] + ' ' + LAST[Math.floor(seed / FIRST.length) % LAST.length]
    attempts++
  } while (used.has(name) && attempts < total)
  return name
}
