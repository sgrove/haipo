import { gql } from "apollo-boost";
import React, { Component } from "react";
import ReactDOM from "react-dom";

import { ApolloProvider, Query } from "react-apollo";
import OneGraphApolloClient from "onegraph-apollo-client";
import OneGraphAuth from "onegraph-auth";

import "./App.css";
import Podcast from "@haiku/zack4-podcast/react";

const APP_ID = "6fdc4610-0219-4c64-af5e-5848ce933766";

const GET_RSS_FEED = gql`
  query getFeed($url: String!) {
    rss {
      rss2Feed(url: $url) {
        items {
          source {
            data
            url
          }
          enclosure {
            url
            length
            mime
          }
          content
          pubDate
          contentUri
          comments
          link
          author
          title
        }
        title
        image {
          height
          title
          uri
          width
          description
        }
      }
    }
  }
`;

const onEnter = cb => {
  return event => {
    if (13 === event.which) {
      cb(event);
    }
  };
};

class AudioPlayer extends Component {
  state = {
    audioPlayerRef: null,
    isAudioPlaying: false,
    callbacks: {
      onPlay: null,
      onPause: null
    }
  };

  _handleEvent(which) {
    return event => {
      let cb = this.state.callbacks[which];
      cb && cb(event);
    };
  }

  componentDidUpdate(oldProps, _, __) {
    /* console.log("Updated props: old/new: ", oldProps, this.props); */
    const audioPlayer = this.state.audioPlayerRef;
    if (!!audioPlayer && oldProps.isPlaying !== this.props.isPlaying) {
      switch (oldProps.isPlaying + "->" + this.props.isPlaying) {
        case "true->false":
          console.log("Pause audio player");
          audioPlayer.pause();
          break;
        case "false->true":
          console.log("Play audio player");
          audioPlayer.play();
          break;
        default:
          console.log("Default case");
      }
    }
  }

  componentDidMount() {
    let audioPlayerRef = ReactDOM.findDOMNode(this.refs.audio_tag);
    this.setState(oldState => {
      console.info("audio prop set");

      audioPlayerRef.addEventListener("play", this._handleEvent("onPlay"));
      audioPlayerRef.addEventListener("pause", this._handleEvent("onPause"));
      audioPlayerRef.addEventListener("seek", this._handleEvent("seek"));
      const callbacks = {
        onPlay: this.props.onPlay,
        onPause: this.props.onPause,
        onSeek: this.props.onSeek
      };
      return { ...oldState, audioPlayerRef, callbacks };
    });
  }

  render() {
    return (
      <audio
        id={"podcast-player"}
        ref="audio_tag"
        src={this.props.src}
        controls
        style={this.props.style}
        autoPlay={true}
      />
    );
  }
}

class App extends Component {
  state = {
    showJson: false,
    rssUrl: "http://podcasts.files.bbci.co.uk/p02pc9pj.rss",
    audioUrl: null,
    haikus: {},
    currentPodcastHaiku: null,
    audioIsPlaying: false
  };

  setCurrentHaikuPlaying(newIsPlaying) {
    const { currentPodcastHaiku, isAudioPlaying } = this.state;
    console.log("setCurrentHaikuPlaying.newIsPlaying->", newIsPlaying);
    if (newIsPlaying !== isAudioPlaying) {
      currentPodcastHaiku &&
        currentPodcastHaiku.routeEventToHandler("*", "setPlayback", {
          newIsPlaying
        });
    }
  }

  constructor(props) {
    super(props);
    this._oneGraphAuth = new OneGraphAuth({
      appId: APP_ID
    });
    this._oneGraphClient = new OneGraphApolloClient({
      oneGraphAuth: this._oneGraphAuth
    });
  }

  _authWithTwitter = async () => {
    await this._oneGraphAuth.login("twitter");
    const isLoggedIn = await this._oneGraphAuth.isLoggedIn("twitter");
    this.setState({ isLoggedIn: isLoggedIn });
  };

  componentDidMount() {
    this._oneGraphAuth
      .isLoggedIn("twitter")
      .then(isLoggedIn => this.setState({ isLoggedIn }));
  }

  render() {
    const setAppState = this.setState.bind(this);
    return (
      <div className="App">
        <h1 className="App-title">
          Podcast Episodes<small>
            {" "}
            -{" "}
            <a
              href="https://codesandbox.io/s/v59jwn477"
              target="_blank"
              rel="noopener noreferrer"
            >
              (Edit source)
            </a>
          </small>
        </h1>

        <div className="App-intro">
          {
            <ApolloProvider client={this._oneGraphClient}>
              <Query
                query={GET_RSS_FEED}
                variables={{
                  url: this.state.rssUrl
                }}
              >
                {({ loading, error, data }) => {
                  if (loading) return <div>Loading feed ...</div>;
                  if (error)
                    return (
                      <div>Uh oh, something went wrong: {error.message}</div>
                    );
                  if (!data.rss) {
                    return <div>Could not find an RSS feed at that url.</div>;
                  }

                  const feed = data.rss.rss2Feed;

                  return (
                    <div>
                      {
                        <div
                          style={{
                            position: "fixed",
                            bottom: "20px",
                            right: "20px",
                            opacity: "0.75",
                            maxWidth: "400px",
                            borderRadius: "4px",
                            backgroundColor: "#8faee0"
                          }}
                        >
                          <img
                            alt="The podcast"
                            width={88}
                            src={feed.image.uri}
                            style={{ float: "left" }}
                          />
                          <h4>{feed.title}</h4>
                          <label htmlFor="url">
                            Podcast url (rss):
                            <input
                              id="url"
                              type="text"
                              placeholder="Podcast url"
                              defaultValue={this.state.rssUrl}
                              onKeyDown={onEnter(event => {
                                const newUrl = event.target.value;
                                this.setState(oldState => {
                                  return { ...oldState, rssUrl: newUrl };
                                });
                              })}
                            />
                          </label>
                          <AudioPlayer
                            id={"podcast-player"}
                            controls
                            src={this.state.audioUrl}
                            style={{ maxWidth: "400px" }}
                            isPlaying={this.state.audioIsPlaying}
                            onPlay={event => {
                              this.setCurrentHaikuPlaying(true);
                              return true;
                            }}
                            onPause={event => {
                              this.setCurrentHaikuPlaying(false);
                              return true;
                            }}
                          />
                        </div>
                      }

                      {feed.items.map((item, idx) => {
                        return (
                          <div
                            key={idx}
                            style={{
                              borderLeft: "1px solid #ccc",
                              paddingLeft: "4px",
                              marginBottom: "16px",
                              maxHeight: "264px",
                              overflowY: "scroll"
                            }}
                          >
                            <Podcast
                              onHaikuComponentDidMount={haiku => {
                                /* console.log("Haiku  #" + idx, haiku); */
                                haiku.on("state:set", (name, something) => {
                                  console.log(
                                    "Haiku state set: ",
                                    name,
                                    something
                                  );
                                });
                                haiku.on("isPlayingWasUpdated", event => {
                                  console.log("Got a haiku event: ", event);
                                  console.log(
                                    `Should be triggering Podcast#${
                                      event.podcastId
                                    }, setting scrUrl to ${
                                      event.srcUrl
                                    }, and playState to ${event.isPlaying}`
                                  );
                                  setAppState(oldState => {
                                    if (
                                      haiku !== this.state.currentPodcastHaiku
                                    ) {
                                      this.setCurrentHaikuPlaying(false);
                                    }
                                    const newState = {
                                      ...oldState,
                                      currentPodcastHaiku: haiku,
                                      audioUrl: event.srcUrl,
                                      audioIsPlaying: event.isPlaying
                                    };
                                    console.log(
                                      "Setting app new state: ",
                                      newState
                                    );
                                    return newState;
                                  });
                                });
                              }}
                              haikuOptions={{ contextMenu: "disabled" }}
                              haikuStates={{
                                podcastId: { value: idx },
                                srcUrl: { value: item.enclosure.url },
                                podcastTitle: { value: item.title },
                                podcastDescription: {
                                  value: item.title
                                }
                              }}
                            />
                          </div>
                        );
                      })}
                      <hr />
                      <pre
                        style={{ cursor: "pointer" }}
                        onClick={_ => {
                          this.setState(oldState => {
                            const newState = {
                              ...oldState,
                              showJson: !oldState.showJson
                            };
                            return newState;
                          });
                        }}
                      >
                        {this.state.showJson
                          ? `▼ RSS->GraphQL response from OneGraph
                                                  ` +
                            JSON.stringify(feed, null, 2)
                          : "▶ Click to show RSS->GraphQL response from OneGraph"}
                      </pre>
                    </div>
                  );
                }}
              </Query>
            </ApolloProvider>
          }
        </div>
      </div>
    );
  }
}

export default App;
