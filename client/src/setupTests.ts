// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Stub visualization libs that ship ESM to avoid transform issues in Jest
jest.mock('react-vega', () => ({
  __esModule: true,
  VegaLite: () => null,
  default: () => null,
}));
// Minimal d3 mocks used by results visuals to avoid ESM import issues in tests
jest.mock('d3-selection', () => {
  const chain = () => {
    const obj: any = {
      append: () => obj,
      attr: () => obj,
      style: () => obj,
      text: () => obj,
      selectAll: () => obj,
      data: () => obj,
      join: () => obj,
      on: () => obj,
      call: () => obj,
      remove: () => obj,
    };
    return obj;
  };
  return {
    select: () => chain(),
  };
});
jest.mock('d3-scale', () => ({
  scaleLinear: () => {
    const fn: any = (x: number) => x;
    fn.domain = () => fn;
    fn.range = () => fn;
    fn.nice = () => fn;
    fn.ticks = () => [];
    return fn;
  },
  scaleBand: () => {
    const fn: any = (x: any) => x;
    fn.domain = () => fn;
    fn.range = () => fn;
    fn.padding = () => fn;
    fn.bandwidth = () => 10;
    return fn;
  },
}));
jest.mock('d3-format', () => ({
  format: () => (n: number) => String(n),
}));
jest.mock('d3-axis', () => {
  const axisChain = () => {
    const obj: any = {
      ticks: () => obj,
      tickFormat: () => obj,
      tickSize: () => obj,
      call: () => obj,
    };
    return obj;
  };
  return {
    axisBottom: () => axisChain(),
    axisLeft: () => axisChain(),
  };
});
jest.mock('d3-brush', () => ({
  brushX: () => {
    const b: any = {
      extent: () => b,
      filter: () => b,
      on: () => b,
    };
    return b;
  },
}));
jest.mock('d3-force', () => ({
  forceSimulation: () => ({
    force: () => ({
      force: () => ({
        force: () => ({ stop: () => ({ tick: () => ({}) }) }),
        stop: () => ({ tick: () => ({}) }),
      }),
      stop: () => ({ tick: () => ({}) }),
    }),
    stop: () => ({ tick: () => ({}) }),
  }),
  forceX: () => () => 0,
  forceY: () => () => 0,
  forceCollide: () => () => 0,
}));
