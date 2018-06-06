import React, { Component } from 'react';
import styled from 'styled-components';

import Home from './Home';

class App extends Component {
  render() {
    return (
      <Container>
        <Header>
          <Headline>
            Buttermilk
            <Version href="https://github.com/probablyup/buttermilk/releases" target="_blank">
              {VERSION.slice(0, VERSION.lastIndexOf('.'))}
            </Version>
          </Headline>
        </Header>

        <Content>
          {this.props.children}
        </Content>
      </Container>
    );
  }
}

const desktop = '@media all and (min-width: 768px)';

const Container = styled.div`
  background: #FAFAFA;
  min-height: 100%;
`;

const Header = styled.header`
  align-items: center;
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 125px;

  ${desktop} {
    min-height: 300px;
  }
`;

const Headline = styled.h1`
  font-family: 'Vibur', sans-serif;
  font-size: 5rem;
  margin: 0;
  position: relative;
  transform: rotate(-6deg);
  transform-origin: center;

  ${desktop} {
    font-size: 10rem;
    text-shadow: 0 0 300px white;
    transition: 500ms text-shadow;

    &:hover {
      text-shadow: 0 0 300px;
    }
  }
`;

const Version = styled.a`
  font-size: 0.25em;
  position: absolute;
  right: -1em;
  bottom: -0.5em;
  text-decoration: none;
`;

const Content = styled.main`
  font-size: 1.6rem;
`;

export default () => (
  <App>
    <Home />
  </App>
);
