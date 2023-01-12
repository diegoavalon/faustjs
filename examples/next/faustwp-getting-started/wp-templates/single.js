import { gql } from '@apollo/client';
import * as MENUS from '../constants/menus';
import { WordPressBlocksViewer } from '@faustwp/blocks';
import { BlogInfoFragment } from '../fragments/GeneralSettings';
import flatListToHierarchical from '../utilities/flatListToHierarchical';
import {
  Header,
  Footer,
  Main,
  Container,
  EntryHeader,
  NavigationMenu,
  ContentWrapper,
  FeaturedImage,
  SEO,
} from '../components';
import components from '../wp-blocks';

function queryData(blocks) {
  const fragments = Object.keys(blocks).map(key => {
    return blocks[key]?.fragments?.entry ? blocks[key]?.fragments?.entry : null;
  }).filter(Boolean);
  const blockKeys = Object.keys(components).map(key => {
    return components[key]?.fragments?.key ? components[key]?.fragments?.key : null;
  }).filter(Boolean);
  return {
    fragments: fragments.map(fragment => `${getGqlString(fragment)}\n`).join('\n'),
    keys: blockKeys.map(key => `...${key}\n`).join('\n')
  }
}

function normalize(string) {
  return string.replace(/[\s,]+/g, ' ').trim();
}

function getGqlString(doc) {
  return doc.loc && normalize(doc.loc.source.body);
}

export default function Component(props) {
  // Loading state for previews
  if (props.loading) {
    return <>Loading...</>;
  }

  const { title: siteTitle, description: siteDescription } =
    props?.data?.generalSettings;
  const primaryMenu = props?.data?.headerMenuItems?.nodes ?? [];
  const footerMenu = props?.data?.footerMenuItems?.nodes ?? [];
  const { title, content, featuredImage, date, author, contentBlocks } =
    props.data.post;
  const blocks = flatListToHierarchical(contentBlocks);

  return (
    <>
      <SEO
        title={siteTitle}
        description={siteDescription}
        imageUrl={featuredImage?.node?.sourceUrl}
      />
      <Header
        title={siteTitle}
        description={siteDescription}
        menuItems={primaryMenu}
      />
      <Main>
        <>
          <EntryHeader
            title={title}
            image={featuredImage?.node}
            date={date}
            author={author?.node?.name}
          />
          <Container>
          {/* <ContentWrapper content={content} /> */}
            <ContentWrapper>
              <WordPressBlocksViewer contentBlocks={blocks} />
            </ContentWrapper>
          </Container>
        </>
      </Main>
      <Footer title={siteTitle} menuItems={footerMenu} />
    </>
  );
}

Component.query = gql`
  ${BlogInfoFragment}
  ${NavigationMenu.fragments.entry}
  ${FeaturedImage.fragments.entry}
  ${queryData(components).fragments}
  query GetPost(
    $databaseId: ID!
    $headerLocation: MenuLocationEnum
    $footerLocation: MenuLocationEnum
    $asPreview: Boolean = false
  ) {
    post(id: $databaseId, idType: DATABASE_ID, asPreview: $asPreview) {
      title
      content
      date
      author {
        node {
          name
        }
      }
      ...FeaturedImageFragment
      contentBlocks {
        __typename
        renderedHtml
        id: nodeId
        parentId
        ${queryData(components).keys}
      }
    }
    generalSettings {
      ...BlogInfoFragment
    }
    headerMenuItems: menuItems(where: { location: $headerLocation }) {
      nodes {
        ...NavigationMenuItemFragment
      }
    }
    footerMenuItems: menuItems(where: { location: $footerLocation }) {
      nodes {
        ...NavigationMenuItemFragment
      }
    }
  }
`;

Component.variables = ({ databaseId }, ctx) => {
  return {
    databaseId,
    headerLocation: MENUS.PRIMARY_LOCATION,
    footerLocation: MENUS.FOOTER_LOCATION,
    asPreview: ctx?.asPreview,
  };
};
