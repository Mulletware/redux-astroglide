declare module "check-prop-types" {
  type PropTypes = {
    [key: string]: any;
  };

  export default function checkPropTypes(
    typeSpecs: PropTypes,
    values: object,
    location: string,
    componentName: string | undefined
  ): string | undefined;
}
