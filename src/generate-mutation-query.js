/**
 * Get a list of columns for the matching project and columns names
 *
 * @param {object} data - The graphQL data
 * @param {string} projectName - The user inputted project name
 * @param {string} columnName - The user inputted column name
 * @param {string} contentId - The id of the issue or pull request
 * @param {"delete"|"archive"|"update"} action - the action to be performed on the card
 */
// if this is important, we will need to refactor the function
// eslint-disable-next-line max-params
const generateMutationQuery = (
  data,
  projectName,
  columnName,
  contentId,
  action
) => {
  // Get fieldId from ProjectV2 Data
  const fieldId =
    data.repository?.projects?.nodes?.columns?.id ||
    data.repository?.owner?.projects?.nodes?.columns?.id;

  // Convert data of projectV2 in classic project
  if (data.repository.projects) {
    data.repository.projects.nodes = data.repository.projects.nodes.map(
      (project) => {
        project.name = project.name;
        project.id = project.id;
        project.columns = project.columns.options;
        return project;
      }
    );
  }

  // Convert data of projectV2Owner in classic project owner
  if (data.repository.owner && data.repository.owner.projects) {
    data.repository.owner.projects.nodes =
      data.repository.owner.projects.nodes.map((project) => {
        project.name = project.name;
        project.id = project.id;
        project.columns = project.columns.options;
        return project;
      });
  }

  // All the projects found in organisation and repositories
  const repoProjects = data.repository.projects.nodes || [];
  const orgProjects =
    (data.repository.owner &&
      data.repository.owner.projects &&
      data.repository.owner.projects.nodes) ||
    [];

  // Find matching projects and columns for the card to move to
  const endLocation = [...repoProjects, ...orgProjects]
    .filter((project) => project.name === projectName)
    .flatMap((project) => project)
    .filter((project) => {
      const matchingColumns = project.columns.nodes.filter(
        (column) => column.name === columnName
      );
      return matchingColumns.length > 0;
    });

  // There are no locations for the card to move to
  if (endLocation.length === 0) {
    throw new Error(
      `Could not find the column "${columnName}" or project "${projectName}"`
    );
  }

  const cardLocations = {};

  // Get the ids of the end card location
  for (const project of endLocation) {
    cardLocations[project.id] = {
      columnId: project.columns.nodes
        .filter((column) => column.name === columnName)
        .map((column) => column.id)[0],
    };
  }

  // See if the card exists in the provided project
  const currentLocation = data.projectCards.nodes.filter(
    (card) => card.project.name === projectName
  );

  for (const card of currentLocation) {
    cardLocations[card.project.id].cardId = card.id;
    cardLocations[card.project.id].isArchived = card.isArchived;
  }

  // If the card already exists in the project move it otherwise add a new card
  const mutations = Object.keys(cardLocations).map((mutation) => {
    if (action === "update") {
      // Othervise keep default procedure
      return cardLocations[mutation].cardId
        ? `mutation {
			updateProjectV2ItemFieldValue( input: {
				projectId: "${mutation}",
				itemId: "${cardLocations[mutation].cardId}",
				fieldId: "${fieldId}",
				values: {
					singleSelectOptionId: "${cardLocations[mutation].columnId}"
				}
			}) { 
				projectV2Item {
					id
				}
			} 
		}`
        : `mutation {
			addProjectV2ItemById( input: {
				projectId: "${mutation}",
				contentId: "${contentId}"
			}) { 
				item {
					id
				  }
			} 
		}`;
    }

    if (action === "delete" && cardLocations[mutation].cardId) {
      // Delete issue from all boards, this if block
      // prevents adding issue in case it has no card yet
      return `mutation {
			deleteProjectV2Item( input: {
				projectId: "${mutation}",
				cardId: "${cardLocations[mutation].cardId}"
			}) { 
				deletedItemId
			} 
		}`;
    }

    if (action === "archive" && !cardLocations[mutation].isArchived) {
      // Archive issue  if not already archived
      return `mutation {
						updateProjectCard(input: { 
							projectCardId: "${cardLocations[mutation].cardId}", 
							isArchived: true 
					}) { clientMutationId } }`;
    }

    if (action === "add" && !cardLocations[mutation].cardId) {
      // Add issue if the card does not exist in the project
      return `mutation {
					addProjectCard( input: {
						contentId: "${contentId}",
						projectColumnId: "${cardLocations[mutation].columnId}"
				}) { clientMutationId } }`;
    }

    return undefined;
  });

  return mutations.filter((m) => m !== undefined);
};

module.exports = generateMutationQuery;
