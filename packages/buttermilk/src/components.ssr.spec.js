/**
 * @jest-environment node
 */
import React from 'react';
import ReactDOMServer from 'react-dom/server';

import { Router, RoutingState } from './components';

const render = props => ReactDOMServer.renderToString(<Router {...props} />);

beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));

describe('Router', () => {
  it('works', () => {
    const result = render({
      routes: [
        {
          path: '/foo',
          render: () => <div>bar</div>,
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(result).toContain('bar');
  });

  it('throws if a url is not passed', () => {
    expect(() => {
      render({
        routes: [
          {
            path: '/foo',
            render: () => <div>bar</div>,
          },
        ],
      });
    }).toThrowError();
  });
});
