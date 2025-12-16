import '@testing-library/jest-dom';
import 'jest-localstorage-mock';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  jest.clearAllMocks();
});
