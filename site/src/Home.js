import Markdown from 'markdown-to-jsx';
import React from 'react';
import { hot } from 'react-hot-loader';
import styled from 'styled-components';
import readme from 'raw-loader!../../README.md';

const [/* h1 tag, badges */, navigation, content] = readme.split(/<!-- \/?TOC -->/);

class Home extends React.PureComponent {
    render() {
        return (
            <Wrapper>
                <Navigation>
                    <Markdown>
                        {navigation.trimLeft().replace(/.*?\n/, '').replace(/^ {4}/gm, '')}
                    </Markdown>

                    <Button onClick={() => window.scrollTo(0, 0)}>
                        back to top ↟
                    </Button>
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

const desktop = '@media all and (min-width: 768px)';
const mobile = '@media all and (max-width: 767px)';

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    padding: 1.5rem 5vw;

    ${desktop} {
        flex-direction: row;
        padding-top: 3rem;
        padding-bottom: 3rem;
    }
`;

const Navigation = styled.nav`
    background: #FAFAFA;
    display: block;
    margin-bottom: 3rem;
    overflow: scroll;
    position: sticky;
    top: 10px;
    white-space: nowrap;

    ${mobile} {
        ul {
            ul {
                display: none;
            }

            li {
                display: inline-block;
                margin: 0 1.5rem 0 0;
            }
        }
    }

    ${desktop} {
        align-self: flex-start;
        margin-bottom: 0;
        margin-right: 5vw;
        overflow: visible;
        width: 20vw;
        min-width: 300px;
        white-space: normal;

        code {
            word-break: break-all;
            white-space: normal;
        }

        ul {
            ul {
                li {
                    list-style: lower-roman;
                }
            }

            li {
                list-style: upper-roman;
            }
        }
    }
`;

const Content = styled.div`
    overflow-x: hidden;
`;

const Button = styled.button`
    display: none;

    ${desktop} {
        background: none;
        border: 1px solid;
        border-radius: 2px;
        cursor: pointer;
        display: inline-block;
        font: inherit;
        margin: 2rem 0 0;
        opacity: 0.5;
        padding: 0.5rem 1rem 0.2rem;
        transition: 300ms opacity ease;

        &:hover, &:focus {
            opacity: 1;
        }
    }
`;

export default hot(module)(Home);
