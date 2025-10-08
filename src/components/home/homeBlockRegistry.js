import {
  getLayoutDefinition,
  getLayoutKeys,
  getLayoutPreviewProps,
} from '@/components/admin/home-blocks/layoutRegistry';

export const getHomeBlockComponent = (layout) => {
  const definition = getLayoutDefinition(layout);
  return definition?.preview?.component ?? null;
};

export const getHomeBlockPreviewProps = (layout, state, context) =>
  getLayoutPreviewProps(layout, state, context);

export const listHomeBlockLayouts = () =>
  getLayoutKeys().filter((layout) => Boolean(getHomeBlockComponent(layout)));

const homeBlockRegistry = Object.freeze(
  listHomeBlockLayouts().reduce((acc, layout) => {
    const component = getHomeBlockComponent(layout);
    if (component) {
      acc[layout] = component;
    }
    return acc;
  }, {}),
);

export default homeBlockRegistry;
