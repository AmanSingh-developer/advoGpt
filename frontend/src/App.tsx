import { ApolloProvider } from "@apollo/client/react";
import client from "./graphql/client";
import AppRouter from "./router";
import { AuthProvider } from "./context/AuthContext";

const App = () => {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ApolloProvider>
  );
};

export default App;
