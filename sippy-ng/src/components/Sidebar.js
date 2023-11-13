import { BOOKMARKS } from '../constants'
import {
  BugReport,
  Code,
  ExpandLess,
  ExpandMore,
  Favorite,
  FileCopyOutlined,
  GitHub,
  Restore,
} from '@mui/icons-material'
import { CapabilitiesContext } from '../App'
import { Link, useLocation } from 'react-router-dom'
import { ListItemButton, ListSubheader, Tooltip, useTheme } from '@mui/material'
import {
  pathForJobsWithFilter,
  pathForTestsWithFilter,
  safeEncodeURIComponent,
  withoutUnstable,
  withSort,
} from '../helpers'
import { pathForTestByVariant, useNewInstallTests } from '../helpers'
import ApartmentIcon from '@mui/icons-material/Apartment'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import HomeIcon from '@mui/icons-material/Home'
import InfoIcon from '@mui/icons-material/Info'
import List from '@mui/material/List'
import ListIcon from '@mui/icons-material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import PropTypes from 'prop-types'
import React, { Fragment, useEffect } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import SippyLogo from './SippyLogo'

export default function Sidebar(props) {
  const classes = useTheme()
  const location = useLocation()

  const [open, setOpen] = React.useState({})

  useEffect(() => {
    return () => {
      // infer release from current url when loading sidebar for first time
      let parts = location.pathname.split('/')
      let tmpOpen = open
      if (parts.length >= 3) {
        let index = props.releases.indexOf(parts[2])
        if (index !== -1) {
          tmpOpen[index] = true
        }
      } else {
        tmpOpen[0] = true
      }
      setOpen(tmpOpen)
    }
  }, [props])

  function handleClick(id) {
    setOpen((prevState) => ({ ...prevState, [id]: !prevState[id] }))
  }

  function reportAnIssueURI() {
    const description = `Describe your feature request or bug:\n\n
    
    Relevant Sippy URL:\n
    ${window.location.href}\n\n`
    return `https://issues.redhat.com/secure/CreateIssueDetails!init.jspa?priority=10200&pid=12323832&issuetype=17&description=${safeEncodeURIComponent(
      description
    )}`
  }

  return (
    <Fragment>
      <List>
        <ListItem component={Link} to="/" key="Home">
          <ListItemButton>
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Home" />
          </ListItemButton>
        </ListItem>
      </List>
      <CapabilitiesContext.Consumer>
        {(value) => {
          if (value.includes('build_clusters')) {
            return (
              <Fragment>
                <Divider />
                <List
                  subheader={
                    <ListSubheader component="div" id="infrastructure">
                      Infrastructure
                    </ListSubheader>
                  }
                >
                  <ListItem
                    key={'build-cluster-health'}
                    component={Link}
                    to={`/build_clusters`}
                    className={classes.nested}
                  >
                    <ListItemButton>
                      <ListItemIcon>
                        <Favorite />
                      </ListItemIcon>
                      <ListItemText primary="Build Cluster Health" />
                    </ListItemButton>
                  </ListItem>
                </List>
              </Fragment>
            )
          }
        }}
      </CapabilitiesContext.Consumer>
      <CapabilitiesContext.Consumer>
        {(value) => {
          if (value.includes('openshift_releases')) {
            return (
              <Fragment>
                <Divider />
                <List
                  subheader={
                    <ListSubheader component="div" id="Overall Components">
                      Experimental
                    </ListSubheader>
                  }
                >
                  <ListItem
                    key={'release-health-'}
                    component={Link}
                    to={'/component_readiness/main'}
                    className={classes.nested}
                  >
                    <ListItemButton>
                      <ListItemIcon>
                        <Tooltip title="This functionality is experimental; please do NOT depend on this data">
                          <InfoIcon />
                        </Tooltip>
                      </ListItemIcon>
                      <ListItemText primary="Component Readiness" />
                    </ListItemButton>
                  </ListItem>
                </List>
              </Fragment>
            )
          }
        }}
      </CapabilitiesContext.Consumer>
      <Divider />
      <List
        subheader={
          <ListSubheader component="div" id="releases">
            Releases
          </ListSubheader>
        }
      >
        {props.releases.map((release, index) => (
          <Fragment key={'section-release-' + index}>
            <ListItem
              key={'item-release-' + index}
              onClick={() => handleClick(index)}
            >
              <ListItemButton>
                {open[index] ? <ExpandLess /> : <ExpandMore />}
                <ListItemText primary={release} />
              </ListItemButton>
            </ListItem>
            <Collapse in={open[index]} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItem
                  key={'release-overview-' + index}
                  component={Link}
                  to={'/release/' + release}
                  className={classes.nested}
                >
                  <ListItemButton>
                    <ListItemIcon>
                      <InfoIcon />
                    </ListItemIcon>
                    <ListItemText primary="Overview" />
                  </ListItemButton>
                </ListItem>
                {release !== 'Presubmits' ? (
                  <CapabilitiesContext.Consumer>
                    {(value) => {
                      if (value.includes('openshift_releases')) {
                        return (
                          <ListItem
                            key={'release-tags-' + index}
                            component={Link}
                            to={`/release/${release}/streams`}
                            className={classes.nested}
                          >
                            <ListItemButton>
                              <ListItemIcon>
                                <FileCopyOutlined />
                              </ListItemIcon>
                              <ListItemText primary="Payload Streams" />
                            </ListItemButton>
                          </ListItem>
                        )
                      }
                    }}
                  </CapabilitiesContext.Consumer>
                ) : (
                  ''
                )}
                <ListItem
                  key={'release-jobs-' + index}
                  component={Link}
                  to={withSort(
                    pathForJobsWithFilter(release, {
                      items: [BOOKMARKS.RUN_7, ...withoutUnstable()],
                    }),
                    'net_improvement',
                    'asc'
                  )}
                  className={classes.nested}
                >
                  <ListItemButton>
                    <ListItemIcon>
                      <ListIcon />
                    </ListItemIcon>
                    <ListItemText primary="Jobs" />
                  </ListItemButton>
                </ListItem>

                {
                  // FIXME: Base this on something like a per-release capabilities feature instead.
                  release === 'Presubmits' ? (
                    <Fragment>
                      <ListItem
                        key={'release-pull-requests-' + index}
                        component={Link}
                        to={`/pull_requests/${release}`}
                        className={classes.nested}
                      >
                        <ListItemButton>
                          <ListItemIcon>
                            <GitHub />
                          </ListItemIcon>
                          <ListItemText primary="Pull Requests" />
                        </ListItemButton>
                      </ListItem>
                      <ListItem
                        key={'release-repositories-' + index}
                        component={Link}
                        to={`/repositories/${release}`}
                        className={classes.nested}
                      >
                        <ListItemButton>
                          <ListItemIcon>
                            <Code />
                          </ListItemIcon>
                          <ListItemText primary="Repositories" />
                        </ListItemButton>
                      </ListItem>
                    </Fragment>
                  ) : (
                    ''
                  )
                }

                <ListItem
                  key={'release-tests-' + index}
                  component={Link}
                  to={withSort(
                    pathForTestsWithFilter(release, {
                      items: [
                        BOOKMARKS.RUN_7,
                        BOOKMARKS.NO_NEVER_STABLE,
                        BOOKMARKS.NO_AGGREGATED,
                        BOOKMARKS.WITHOUT_OVERALL_JOB_RESULT,
                        BOOKMARKS.NO_STEP_GRAPH,
                        BOOKMARKS.NO_OPENSHIFT_TESTS_SHOULD_WORK,
                      ],
                      linkOperator: 'and',
                    }),
                    'current_working_percentage',
                    'asc'
                  )}
                  className={classes.nested}
                >
                  <ListItemButton>
                    <ListItemIcon>
                      <SearchIcon />
                    </ListItemIcon>
                    <ListItemText primary="Tests" />
                  </ListItemButton>
                </ListItem>

                <CapabilitiesContext.Consumer>
                  {(value) => {
                    if (value.includes('openshift_releases')) {
                      return (
                        <ListItem
                          key={'release-upgrade-' + index}
                          component={Link}
                          to={'/upgrade/' + release}
                          className={classes.nested}
                        >
                          <ListItemButton>
                            <ListItemIcon>
                              <ArrowUpwardIcon />
                            </ListItemIcon>
                            <ListItemText primary="Upgrade" />
                          </ListItemButton>
                        </ListItem>
                      )
                    }
                  }}
                </CapabilitiesContext.Consumer>

                <CapabilitiesContext.Consumer>
                  {(value) => {
                    if (value.includes('openshift_releases')) {
                      return (
                        <ListItem
                          key={'release-install-' + index}
                          component={Link}
                          to={'/install/' + release}
                          className={classes.nested}
                        >
                          <ListItemButton>
                            <ListItemIcon>
                              <ExitToAppIcon />
                            </ListItemIcon>
                            <ListItemText primary="Install" />
                          </ListItemButton>
                        </ListItem>
                      )
                    }
                  }}
                </CapabilitiesContext.Consumer>

                <CapabilitiesContext.Consumer>
                  {(value) => {
                    if (value.includes('openshift_releases')) {
                      let newInstall = useNewInstallTests(release)
                      let link
                      if (newInstall) {
                        link = pathForTestByVariant(
                          release,
                          'install should succeed: infrastructure'
                        )
                      } else {
                        link = pathForTestByVariant(
                          release,
                          '[sig-sippy] infrastructure should work'
                        )
                      }

                      return (
                        <ListItem
                          key={'release-infrastructure-' + index}
                          component={Link}
                          to={link}
                          className={classes.nested}
                        >
                          <ListItemButton>
                            <ListItemIcon>
                              <ApartmentIcon />
                            </ListItemIcon>
                            <ListItemText primary="Infrastructure" />
                          </ListItemButton>
                        </ListItem>
                      )
                    }
                  }}
                </CapabilitiesContext.Consumer>
              </List>
            </Collapse>
          </Fragment>
        ))}
      </List>
      <Divider />
      <List
        subheader={
          <ListSubheader component="div" id="resources">
            Resources
          </ListSubheader>
        }
      >
        <ListItem
          component="a"
          target="_blank"
          href={reportAnIssueURI()}
          key="ReportAnIssue"
        >
          <ListItemIcon>
            <BugReport />
          </ListItemIcon>
          <ListItemText primary="Report an Issue" />
        </ListItem>

        <ListItem
          component="a"
          target="_blank"
          href="https://www.github.com/openshift/sippy"
          key="GitHub"
        >
          <ListItemIcon>
            <GitHub />
          </ListItemIcon>
          <ListItemText primary="GitHub Repo" />
        </ListItem>
        <Divider />
        <div align="center">
          <SippyLogo />
        </div>
      </List>
    </Fragment>
  )
}

Sidebar.propTypes = {
  releases: PropTypes.array,
}
