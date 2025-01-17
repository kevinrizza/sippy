package releaseloader

import (
	"strings"

	"github.com/anaskhan96/soup"
	log "github.com/sirupsen/logrus"

	"github.com/openshift/sippy/pkg/db/models"
)

// Changelog scrapes the release controller's generated HTML for a release,
// and converts it into a more structured form.  The release controller
// is currently only capable of delivering this data to us in rendered HTML,
// as it passes through several asynchronous systems before the release
// controller even sees it.
type Changelog struct {
	releaseTag string
	root       soup.Root
}

func NewChangelog(releaseTag, html string) *Changelog {
	return &Changelog{
		releaseTag: releaseTag,
		root:       soup.HTMLParse(html),
	}
}

func (c *Changelog) PreviousReleaseTag() string {
	headings := c.root.FindAll("h2")
	for _, heading := range headings {
		if strings.Contains(heading.Text(), "Changes from") {
			_, previousTag, err := extractAnchor(heading.Find("a"))
			if err != nil {
				continue
			}
			return previousTag
		}
	}

	return ""
}

func (c *Changelog) CoreOSVersion() (currentURL, currentVersion, previousURL, previousVersion, diffURL string) {
	component := c.extractComponent("CoreOS")
	if strings.Contains(component.Text(), "upgraded from") {
		anchors := component.FindAll("a")
		if len(anchors) == 3 {
			previousURL, previousVersion, _ = extractAnchor(anchors[0])
			currentURL, currentVersion, _ = extractAnchor(anchors[1])
			diffURL, _, _ = extractAnchor(anchors[2])
		}
	} else {
		currentURL, currentVersion, _ = extractAnchor(component.Find("a"))
	}

	return
}

func (c *Changelog) KubernetesVersion() string {
	component := c.extractComponent("Kubernetes")
	if component == nil {
		return ""
	}
	parts := strings.Split(component.Text(), " ")
	if len(parts) > 1 {
		return parts[len(parts)-1]
	}
	return ""
}

func (c *Changelog) Repositories() []models.ReleaseRepository {
	sections := c.root.FindAll("h3")
	if len(sections) == 0 {
		return nil
	}

	rows := make([]models.ReleaseRepository, 0)
	for _, section := range sections {
		head, imageName, err := extractAnchor(section.Find("a"))
		if err != nil {
			continue
		}
		row := models.ReleaseRepository{
			Name: imageName,
			Head: head,
		}
		ul := section.FindNextElementSibling()
		if ul.Error != nil {
			continue
		}
		items := ul.FindAll("li")
		if len(items) == 0 {
			continue
		}
		for _, item := range items {
			url, text, err := extractAnchor(item.Find("a"))
			if err != nil {
				continue
			}
			if strings.Contains(text, "Full changelog") {
				row.DiffURL = url
			}
		}
		rows = append(rows, row)
	}

	return rows
}

func (c *Changelog) PullRequests() []models.ReleasePullRequest {
	sections := c.root.FindAll("h3")
	if len(sections) == 0 {
		return nil
	}

	// Ensure PR uniqueness, there have been examples of the release controller
	// listing the same PR twice (from upstream and the fork). See OCPCRT-152.
	type prlocator struct {
		name string
		url  string
	}
	rows := make(map[prlocator]models.ReleasePullRequest)

	for _, section := range sections {
		_, imageName, err := extractAnchor(section.Find("a"))
		if err != nil {
			continue
		}
		ul := section.FindNextElementSibling()
		if ul.Error != nil {
			continue
		}
		items := ul.FindAll("li")
		if len(items) == 0 {
			continue
		}
		for _, item := range items {
			if item.Text() == "" {
				continue
			}
			row := models.ReleasePullRequest{
				Name: imageName,
			}
			row.Description = strings.Trim(strings.TrimPrefix(item.Text(), ": "), " ")
			anchors := item.FindAll("a")
			for _, anchor := range anchors {
				url, text, err := extractAnchor(anchor)
				if err != nil {
					continue
				}
				if strings.Contains(url, "github.com") {
					row.URL = url
					row.PullRequestID = strings.ReplaceAll(text, "#", "")
				}
				if strings.Contains(url, "bugzilla.redhat.com") || strings.Contains(url, "issues.redhat.com") {
					row.BugURL = url
				}
			}

			prl := prlocator{
				url:  row.URL,
				name: row.Name,
			}
			if _, ok := rows[prl]; ok {
				log.Warningf("duplicate PR in %q: %q, %q", c.releaseTag, row.URL, row.Name)
			} else {
				rows[prl] = row
			}
		}
	}

	result := make([]models.ReleasePullRequest, 0)
	items := 0
	for _, v := range rows {
		// We had a case of a release payload changelog that contained 235,000 pull requests. Sippy got stuck on it
		// so this check is here to prevent something like that from ever happening again.  2,500 seems like a very
		// reasonable upper bound.
		if items > 2500 {
			log.Warningf("%q had more than 2,500 PR's! Ignoring the rest to protect ourself.", c.releaseTag)
			break
		}
		result = append(result, v)
		items++
	}
	return result
}

func extractAnchor(anchor soup.Root) (href, text string, err error) {
	if anchor.Error != nil {
		err = anchor.Error
		return
	}
	attrs := anchor.Attrs()
	if link, ok := attrs["href"]; ok {
		href = link
	}
	text = anchor.Text()
	return
}

func (c *Changelog) extractComponent(name string) (component *soup.Root) {
	sections := c.root.FindAll("h3")
	if len(sections) == 0 {
		return nil
	}
	for _, section := range sections {
		if section.Text() == "Components" {
			list := section.FindNextElementSibling()
			if list.Error != nil {
				return nil
			}
			components := list.FindAll("li")
			for _, component := range components {
				if strings.Contains(component.Text(), name) {
					return &component

				}
			}
		}
	}

	return nil
}
