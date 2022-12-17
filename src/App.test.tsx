import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});

//INLINE https://th.bing.com/th/id/OIP.VEZebOkJUQmF2d2IFUfloQHaGL?pid=ImgDet&rs=1