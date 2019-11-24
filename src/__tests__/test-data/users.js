const user1 = {
  address: '0x08abf5d121998b8bb022156ef972e22f9fb84f3a',
  did: 'did:muport:QmXfH6B8yosXTfyWBziBSY5zZpqjVbsJN18yk56EpmYDb5',
  spaceoneDid: 'did:3:bafyreicplngujln6wnmhsmsxx34axxgg5xootcq4zkicz7x7o2kub7pdje',
  rootStore: "/orbitdb/QmdocSxFGo84tod5DRW5LUeSYcQpG3WVYjB5znx1A5QFMs/12203666f93fdc578232887a4cc1b5a60171f979ca9b5e7845f4f49834d217f11b98.root"
}

const user2 = {
  address: '0x26618f5c6ea223cfdf94c033ccdc8eccbf990a34',
  did: 'did:muport:QmU3rKK7zAAswGWX7863m5iY78NEPZc5sfAENCkefQLvFX',
  spaceoneDid: 'did:3:bafyreifihp3yf4igdmi2woiqo2wymz2vdt2pwbnwjlvum4aly3277bbaam',
  rootStore: "/orbitdb/QmY4CemYGA8vM7o5GxzfpfDkreudDjQJX1fGxkfgDm9pM4/1220abf954f044f07562415931a6986d4fb2dbd0f3c4c2a13ec95d463518a967ac2a.root"
}

const user3 = {
  address: '0x0acc7a1ffe266b2192c8f717141a0cc03672bfba',
  did: 'did:muport:QmUAxywv5B3W9U2GSHHncTak2M4uCiEbc9mN2uE8HhhJGM',
  rootStore: "/orbitdb/QmeQxxTTVXFTtM9FvtRE4n3shyzevLYzudV6ZMFnzwX7yy/1220a0aad86899dcf21abd133ea7515601c82ebffc1a3eb206504619d0c14a1b2520.root"
}

const notUser = {
  address: '0x1eE6aE029c6D99fF3a810CF8EAA31D193c89ec9c',
  did: 'did:muport:QmQAnachTJXMVHKa5Nu3mZNn5jGrJ9TvHJde3NSp8J4qzL'
}

const uriComponents = (obj) => {
  const uri = {
    didURI: encodeURIComponent(obj.did),
  }
  if (obj.spaceoneDid) uri.spaceoneDidURI = encodeURIComponent(obj.spaceoneDid)
  return Object.assign({}, obj, uri)
}

module.exports = {
  user1: uriComponents(user1),
  user2: uriComponents(user2),
  user3: uriComponents(user3),
  notUser: uriComponents(notUser)
}
