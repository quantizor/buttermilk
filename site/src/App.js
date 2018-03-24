import React, { Component } from 'react';
import { hot } from 'react-hot-loader';
import styled from 'styled-components';

import { Link, Router } from '../../src';
import Home from './Home';

class App extends Component {
  render() {
    return (
      <Container>
        <Header>
          <Headline>
            Buttermilk
          </Headline>
        </Header>

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
  font-family: 'Vibur', sans-serif;
  font-size: 10rem;
  margin: 0;
  transform: rotate(-6deg);
  transform-origin: center;
`;

const Content = styled.main`
  font-size: 1.6rem;
  padding: 3rem 0;
`;

const routes = [{
  path: '*',
  render: () => Home,
}];

const HotApp = hot(module)(App);

export default () => (
  <Router
    outerComponent={HotApp}
    routes={routes}
  />
);
