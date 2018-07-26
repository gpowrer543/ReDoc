import * as React from 'react';
import { AppStore } from '../../services/AppStore';
export interface ApiDescriptionProps {
    store: AppStore;
}
export declare class ApiDescription extends React.PureComponent<ApiDescriptionProps> {
    render(): JSX.Element;
}
