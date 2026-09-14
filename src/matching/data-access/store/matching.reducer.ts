import discoverReducer from './discover/discover.slice';

// The matching domain currently owns one shared workflow: discovery queues.
// Additional matching features can be registered here without changing app state shape.
export default discoverReducer;
