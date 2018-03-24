// import hljs from 'highlight.js';
// import 'style-loader!css-loader!highlight.js/styles/solarized-light.css'
import Markdown from 'markdown-to-jsx';

import React from 'react';
import { hot } from 'react-hot-loader';
import styled from 'styled-components';
import readme from 'raw-loader!../../README.md';

const [/* h1 tag, badges */, navigation, content] = readme.split(/<!-- \/?TOC -->/);

class Home extends React.PureComponent {
    // componentDidMount() { hljs.initHighlighting() }

    render() {
        return (
            <Wrapper>
                <Navigation>
                    <Markdown>
                        {navigation.trimLeft().replace(/.*?\n/, '').replace(/^ {4}/gm, '')}
                    </Markdown>
                </Navigation>

                <Content>
                    <Markdown>
                        {content}
                    </Markdown>
                </Content>
            </Wrapper>
        );
    }
}

const Wrapper = styled.div`
    display: flex;
    padding: 0 5vw;
`;

const Navigation = styled.nav`
    align-self: flex-start;
    margin-right: 5vw;
    overflow: hidden;
    position: sticky;
    top: 10px;
    width: 20vw;
    min-width: 300px;

    code {
        word-break: break-all;
        white-space: normal;
    }

    ul {
        margin: 0;

        ul {
            margin: 0 0 1rem 1.5rem;
            padding: 0;

            li {
                list-style: lower-roman;
            }
        }

        li {
            list-style: upper-roman;
            margin: 0.5rem 0;
        }
    }
`;

const Content = styled.div`
    overflow-x: hidden;
`;

export default hot(module)(Home);
