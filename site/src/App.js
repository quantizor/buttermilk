import React, { Component } from 'react';
import { hot } from 'react-hot-loader';
import styled from 'styled-components';

import { Link, Router } from '../../src';

class App extends Component {
  render() {
    return (
      <Container>
        <Header>
          <Headline>
            Buttermilk
          </Headline>
        </Header>

        <Navigation>
          <Link href="/">Home</Link>
          <Link href="/documentation">Documentation</Link>
        </Navigation>

        <Content>
          {this.props.children}
        </Content>
      </Container>
    );
  }
}

const Container = styled.div`
  background: #FAFAFA;
  min-height: 100%;
`;

const Header = styled.header`
  align-items: center;
  background: white;
  display: flex;
  flex-direction: column;
  min-height: 300px;
  justify-content: center;
`;

const Headline = styled.h1`
  color: #6E0000;
  font-family: 'Vibur', sans-serif;
  font-size: 10rem;
  transform: rotate(-6deg);
  transform-origin: center;
`;

const Navigation = styled.nav`
  align-items: center;
  display: flex;
  font-size: 1.3rem;
  padding: 1rem 1.5rem;

  > * + * {
    margin-left: 1rem;
  }
`;

const Content = styled.main`
  font-size: 1.6rem;
  padding: 1.5rem;
`;

const routes = [{
  path: '/documentation',
  render: () => import('./Documentation').then(mdl => mdl.default),
}, {
  path: '*',
  render: () => import('./Home').then(mdl => mdl.default),
}];

const Setup = () => (
  <Router
    outerComponent={App}
    routes={routes}
  />
);

export default hot(module)(Setup);
