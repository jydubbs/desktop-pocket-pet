// Where graduated pets hang out. You pick one in the hangout window; it changes the scene and the words around it.
const HANGOUTS = {
  cafe: { id: 'cafe', name: 'Café', place: 'the café', button: 'Café' },
  picnic: { id: 'picnic', name: 'Picnic garden', place: 'the picnic garden', button: 'Picnic' },
  space: { id: 'space', name: 'Space station', place: 'the space station', button: 'Space' },
};
const hangout = (id) => HANGOUTS[id] || HANGOUTS.cafe;

module.exports = { HANGOUTS, hangout };
