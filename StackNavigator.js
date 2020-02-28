/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, {Component} from 'react';
import {LoginView, adService} from 'ad-b2c-react-native';
import {
    Platform,
    StyleSheet,
    Alert,
    Text,
    View,
    Button,
} from 'react-native';
import {StackNavigator} from 'react-navigation';
import RNSecureKeyStore, {ACCESSIBLE} from 'react-native-secure-key-store';

class HomeScreen extends Component {
    static navigationOptions = {
        title: '主页',
    };

    render() {
        return (
            <View style={styles.container}>
                <Text style={{fontSize: 30}}>主页页面</Text>
                <Button title='跳转到详情'
                        onPress={() => this.props.navigation.navigate('Details', {
                            userName: 'Tory',
                            userInfo: 'Hello',
                            title: '详情页',
                        })}
                />
            </View>
        );
    }
}


class DetailsScreen extends React.Component {
    state = {count: 0};
    static navigationOptions = (props) => {
        const params = props.navigation.state.params;
        return {
            title: '详情页',
            headerRight: (                        //通过params为按钮绑定increase方法
                <Button onPress={params.increase} title="+1"/>
            ),
        };
    };

    componentWillMount() {                    //通过setParams将increase方法绑定到_increase
        this.props.navigation.setParams({increase: this._increase});
    }

    _increase = () => {                           //设置state.count+1
        this.setState(preState => {
            return {count: preState.count + 1};
        });
    };

    constructor(props) {
        super(props);
        this.onLogin = this.onLogin.bind(this);
        this.onFail = this.onFail.bind(this);
        this.spinner = this.spinner.bind(this);
    }

    async onLogin() {
        Alert.alert('登录成功');
        const {navigation} = this.props;
        const tokenResult = await adService.getAccessTokenAsync();
        console.log('登录成功');
        console.log(tokenResult);

        // navigation.navigate('App');
    }

    onFail(reason) {
        Alert.alert('登录失败了');
        Alert.alert(reason);
    }

    spinner() {
        //this is just a sample implementation, so copy pasting will not work as the components used below are custom
        //and are not in imports above. Please replace it with your implementation.
        return (
            <Text>
                "Loading"
            </Text>
        )
            ;
    }


    componentWillMount() {                    //通过setParams将increase方法绑定到_increase
        this.props.navigation.setParams({increase: this._increase});
    }

    _increase = () => {                           //设置state.count+1
        this.setState(preState => {
            return {count: preState.count + 1};
        });
    };

    render() {
        return (
            <View style={styles.container}>
                <Text style={{fontSize: 30}}>计数为：{this.state.count}</Text>
                <Button title='跳转Modal页'
                        onPress={() => this.props.navigation.navigate('Modal')}
                />
            </View>
        );
    }
}

//第三个页面
class ModalScreen extends Component {
    static navigationOptions = {
        title: 'Modal页',
    };

    render() {
        // return (
        //     <View style={styles.container}>
        //        <Text style={{fontSize: 30}}>Modal页页面</Text>
        //     </View>
        // )
        return (
            <LoginView
                appId="41ff4807-b364-4f45-a10b-e69d124d326d"
                // redirectURI="dataintegration%3A%2F%2Fauth"
                // redirectURI="http%3A%2F%2Flocalhost:8081"
                // redirectURI="cn.onmschina.partner.dataintegration.dataintegration%3A%2F%2Foauth%2Fredirect"
                redirectURI="https://jwt.ms"
                tenant="dataintegration"
                loginPolicy="b2c_1a_signup_signin_phone"
                passwordResetPolicy="b2c_1a_signup_signin_phone"
                profileEditPolicy="b2c_1a_signup_signin_phone"
                onSuccess={async () => {
                    const tokenResult = await adService.getAccessTokenAsync();
                    Alert.alert('登录成功六六六' + tokenResult.data);
                    console.log('登录成功零零零零');
                    console.log(tokenResult.data);
                    // navigation.navigate('Home');
                }}
                onFail={(reason) => Alert.alert('十八楼' + reason)}
                secureStore={RNSecureKeyStore}
                // renderLoading={this.spinner}
            />
        );
    }
}

const MainStack = StackNavigator(   //二级路由
    {
        Home: {screen: HomeScreen},
        Details: {screen: DetailsScreen},
    },
    {
        headerMode: 'none',            //隐藏二级路由的头部
    },
);

const RootStack = StackNavigator(   //根路由
    {
        Main: {screen: MainStack},    //将StackNavigator作为组件
        Modal: {screen: ModalScreen},
    },
);

export default class App extends Component {
    render() {                            //将Navigation作为根路径导出
        return <RootStack/>;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5FCFF',
    },
});
