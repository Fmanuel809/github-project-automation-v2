/**
 * GraphQl query to get project and column information
 *
 * @param {string} url - Issue or Pull request url
 * @param {string} eventName - The current event name
 * @param {string} project - The project to find
 */
const projectQuery = (url, eventName, project) =>
  `query {
		resource( url: "${url}" ) {
			... on ${eventName.startsWith("issue") ? "Issue" : "PullRequest"} {
			projectCards: projectItems(first: 100) {
			  nodes {
				id
				isArchived
				project {
				  name: title
				  id
				}
			  }
			}
			repository {
			  projects: projectsV2(query: "title: ${project}", first: 10) {
				nodes {
				  name: title
				  id
				  columns: field(name: "Status") {
					fieldId: id
					... on ProjectV2SingleSelectField {
					  options {
						id
						name
					  }
					}
				  }
				}
			  }
			  owner {
				... on ProjectV2Owner {
				  projects: projectsV2(query: "title: ${project}", first: 10) {
					nodes {
					  name: title
					  id
					  columns: field(name: "Status") {
						fieldId: id
						... on ProjectV2SingleSelectField {
						  options {
							id
							name
						  }
						}
					  }
					}
				  }
				}
			  }
			}
		  }
		}
	  }`;

module.exports = projectQuery;
