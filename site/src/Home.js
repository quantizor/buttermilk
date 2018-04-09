import { rgba } from 'polished';
import Markdown from 'markdown-to-jsx';
import React from 'react';
import styled from 'styled-components';
import readme from 'raw-loader!../../README.md';

const [/* h1 tag, badges */, navigation, content] = readme.split(/<!-- \/?TOC -->/);

export default class Home extends React.PureComponent {
    render() {
        return (
            <Wrapper>
                <Navigation>
                    <Markdown>
                        {navigation.trim().replace(/.*?\n/, '').replace(/^ {4}/gm, '')}
                    </Markdown>

                    <GithubLink
                        href="https://github.com/probablyup/buttermilk"
                        title="Go to the Buttermilk Github page"
                    >
                        {GithubIcon}
                    </GithubLink>

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
    display: block;
    margin-bottom: 3rem;
    position: sticky;
    top: 10px;
    white-space: nowrap;
    z-index: 1;

    ${mobile} {
        &::before {
            background: ${rgba('#FAFAFA', 0.9)};
            border-bottom: 1px solid #DDD;
            content: '';
            position: absolute;
            left: -5vw;
            right: -5vw;
            top: -10px;
            bottom: -10px;
            z-index: -1;
        }

        ul {
            display: inline-block;
            margin: 0;
            padding: 0;

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
        width: 20vw;
        min-width: 300px;
        white-space: normal;

        code {
            word-break: break-all;
            white-space: normal;
        }


        ul {
            margin: 0;
            padding: 0;

            ul {
                margin: 0 0 1rem 1.5rem;

                li {
                    margin: 0.5rem 0;
                    list-style: lower-roman;
                }
            }

            li {
                list-style: upper-roman;
            }
        }
    }
`;

const GithubLink = styled.a`
    margin-right: 1em;
`;

const GithubIconBase = styled.svg`
    display: inline-block;
    height: 1em;
    width: 1em;
    vertical-align: middle;
`;

const GithubIcon = (
    <GithubIconBase
        role="img"
        title="GitHub icon"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
            fill="currentColor"
        />
    </GithubIconBase>
);

const Content = styled.div`
    overflow-x: hidden;
`;

const Button = styled.button`
    display: none;

    ${desktop} {
        background: none;
        border: none;
        cursor: pointer;
        display: inline-block;
        font: inherit;
        line-height: 1;
        margin: 2rem 0 0;
        padding: 0;
        opacity: 0.5;
        transition: 300ms opacity ease;

        &:hover, &:focus {
            opacity: 1;
        }
    }
`;
