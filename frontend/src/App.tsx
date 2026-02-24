import { ApolloProvider } from "@apollo/client/react";
import client from "./graphql/client";
import AppRouter from "./router";

const App = () => {
  return (
    <ApolloProvider client={client}>
      <AppRouter />
    </ApolloProvider>
  );
};

export default App;